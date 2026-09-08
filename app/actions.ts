"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { sql } from "@/lib/db";
import type { Priority, Todo } from "./types";

type Row = {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
  priority: Priority;
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getTodos(): Promise<Todo[]> {
  const userId = await requireUserId();

  // format the DATE in SQL so the driver hands back a plain yyyy-mm-dd string
  const rows = (await sql`
    SELECT id, text, done, to_char(due_date, 'YYYY-MM-DD') AS due_date, priority
    FROM todos
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as Row[];

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    done: row.done,
    dueDate: row.due_date ?? "",
    priority: row.priority,
  }));
}

export async function addTodo(
  text: string,
  dueDate: string,
  priority: Priority
) {
  const userId = await requireUserId();
  const trimmed = text.trim();
  if (!trimmed) return;

  await sql`
    INSERT INTO todos (text, due_date, priority, user_id)
    VALUES (${trimmed}, ${dueDate || null}, ${priority}, ${userId})
  `;
  revalidatePath("/");
}

export async function toggleTodo(id: string) {
  const userId = await requireUserId();
  await sql`
    UPDATE todos SET done = NOT done
    WHERE id = ${id} AND user_id = ${userId}
  `;
  revalidatePath("/");
}

export async function deleteTodo(id: string) {
  const userId = await requireUserId();
  await sql`DELETE FROM todos WHERE id = ${id} AND user_id = ${userId}`;
  revalidatePath("/");
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
