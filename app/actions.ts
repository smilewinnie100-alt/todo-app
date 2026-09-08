"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { sql } from "@/lib/db";
import type { Kind, Person, Priority, Todo, TodoInput } from "./types";

type Row = {
  id: string;
  kind: Kind;
  text: string;
  done: boolean;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  priority: Priority;
  is_owner: boolean;
  owner_name: string;
  shared_with: Person[];
};

export type ActionResult = { error?: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** Sharees are full co-editors, so "can touch this item" is owner OR shared-with. */
async function requireAccess(todoId: string, userId: string): Promise<void> {
  const rows = await sql`
    SELECT 1
    FROM todos t
    LEFT JOIN todo_shares s ON s.todo_id = t.id AND s.user_id = ${userId}::uuid
    WHERE t.id = ${todoId}::uuid
      AND (t.user_id = ${userId} OR s.user_id IS NOT NULL)
  `;
  if (rows.length === 0) throw new Error("Not found");
}

async function isOwner(todoId: string, userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM todos WHERE id = ${todoId}::uuid AND user_id = ${userId}
  `;
  return rows.length > 0;
}

function validate(input: TodoInput): string | null {
  if (!input.text.trim()) return "내용을 입력하세요.";

  if (input.kind === "event") {
    if (!input.dueDate) return "일정에는 날짜가 필요합니다.";
    if (!input.startTime || !input.endTime) {
      return "일정에는 시작 시간과 종료 시간이 모두 필요합니다.";
    }
    if (input.endTime <= input.startTime) {
      return "종료 시간은 시작 시간보다 뒤여야 합니다.";
    }
  } else if (input.endTime && !input.dueDate) {
    return "마감시간을 넣으려면 마감일도 함께 골라주세요.";
  }
  return null;
}

/** Drops any id that is not in the caller's co-worker list — you can only share with people you added. */
async function allowedShareIds(
  userId: string,
  requested: string[]
): Promise<string[]> {
  const unique = [...new Set(requested)];
  if (unique.length === 0) return [];

  const rows = (await sql`
    SELECT coworker_id::text AS id FROM coworkers WHERE owner_id = ${userId}::uuid
  `) as { id: string }[];

  const allowed = new Set(rows.map((row) => row.id));
  return unique.filter((id) => allowed.has(id));
}

export async function getTodos(): Promise<Todo[]> {
  const userId = await requireUserId();

  // Dates and times are formatted in SQL so the driver hands back plain
  // yyyy-mm-dd / HH:MM strings rather than Date objects in the server's zone.
  const rows = (await sql`
    SELECT
      t.id,
      t.kind,
      t.text,
      t.done,
      to_char(t.due_date,   'YYYY-MM-DD') AS due_date,
      to_char(t.start_time, 'HH24:MI')    AS start_time,
      to_char(t.end_time,   'HH24:MI')    AS end_time,
      t.priority,
      (t.user_id = ${userId})             AS is_owner,
      COALESCE(owner.name, owner.email)   AS owner_name,
      COALESCE((
        SELECT json_agg(
                 json_build_object(
                   'id',    u.id,
                   'name',  COALESCE(u.name, u.email),
                   'email', u.email
                 ) ORDER BY u.email
               )
        FROM todo_shares sw
        JOIN users u ON u.id = sw.user_id
        WHERE sw.todo_id = t.id
      ), '[]'::json)                      AS shared_with
    FROM todos t
    JOIN users owner ON owner.id = t.user_id::uuid
    LEFT JOIN todo_shares s ON s.todo_id = t.id AND s.user_id = ${userId}::uuid
    WHERE t.user_id = ${userId} OR s.user_id IS NOT NULL
    ORDER BY t.created_at DESC
  `) as Row[];

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    text: row.text,
    done: row.done,
    dueDate: row.due_date ?? "",
    startTime: row.start_time ?? "",
    endTime: row.end_time ?? "",
    priority: row.priority,
    isOwner: row.is_owner,
    ownerName: row.owner_name,
    sharedWith: row.shared_with,
  }));
}

export async function addTodo(input: TodoInput): Promise<ActionResult> {
  const userId = await requireUserId();

  const problem = validate(input);
  if (problem) return { error: problem };

  const targets = await allowedShareIds(userId, input.shareWith);
  const startTime = input.kind === "event" ? input.startTime : null;

  // One statement so the item, its shares, and the "shared with you" notices
  // either all land or none do.
  await sql`
    WITH new_todo AS (
      INSERT INTO todos (kind, text, due_date, start_time, end_time, priority, user_id)
      VALUES (
        ${input.kind},
        ${input.text.trim()},
        ${input.dueDate || null},
        ${startTime},
        ${input.endTime || null},
        ${input.priority},
        ${userId}
      )
      RETURNING id
    ),
    targets AS (
      SELECT value::uuid AS user_id
      FROM json_array_elements_text(${JSON.stringify(targets)}::json)
    ),
    new_shares AS (
      INSERT INTO todo_shares (todo_id, user_id)
      SELECT new_todo.id, targets.user_id FROM new_todo, targets
      RETURNING todo_id, user_id
    )
    INSERT INTO notifications (user_id, actor_id, todo_id, kind)
    SELECT new_shares.user_id, ${userId}::uuid, new_shares.todo_id, 'todo_shared'
    FROM new_shares
  `;

  revalidatePath("/");
  return {};
}

export async function updateTodo(
  id: string,
  input: TodoInput
): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireAccess(id, userId);

  const problem = validate(input);
  if (problem) return { error: problem };

  const startTime = input.kind === "event" ? input.startTime : null;

  await sql`
    UPDATE todos SET
      kind       = ${input.kind},
      text       = ${input.text.trim()},
      due_date   = ${input.dueDate || null},
      start_time = ${startTime},
      end_time   = ${input.endTime || null},
      priority   = ${input.priority}
    WHERE id = ${id}::uuid
  `;

  // Co-editors may change the item itself, but only the owner decides who sees it.
  if (await isOwner(id, userId)) {
    const targets = await allowedShareIds(userId, input.shareWith);
    const json = JSON.stringify(targets);

    await sql`
      WITH targets AS (
        SELECT value::uuid AS user_id
        FROM json_array_elements_text(${json}::json)
      ),
      removed AS (
        DELETE FROM todo_shares
        WHERE todo_id = ${id}::uuid
          AND user_id NOT IN (SELECT user_id FROM targets)
        RETURNING user_id
      ),
      added AS (
        INSERT INTO todo_shares (todo_id, user_id)
        SELECT ${id}::uuid, targets.user_id FROM targets
        ON CONFLICT (todo_id, user_id) DO NOTHING
        RETURNING user_id
      )
      INSERT INTO notifications (user_id, actor_id, todo_id, kind)
      SELECT user_id, ${userId}::uuid, ${id}::uuid, 'todo_shared'   FROM added
      UNION ALL
      SELECT user_id, ${userId}::uuid, ${id}::uuid, 'todo_unshared' FROM removed
    `;
  }

  revalidatePath("/");
  return {};
}

export async function toggleTodo(id: string) {
  const userId = await requireUserId();
  await requireAccess(id, userId);
  await sql`UPDATE todos SET done = NOT done WHERE id = ${id}::uuid`;
  revalidatePath("/");
}

export async function deleteTodo(id: string) {
  const userId = await requireUserId();
  await requireAccess(id, userId);
  await sql`DELETE FROM todos WHERE id = ${id}::uuid`;
  revalidatePath("/");
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
