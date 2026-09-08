"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import type { AppNotification } from "./types";

const INBOX_LIMIT = 30;

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const userId = await requireUserId();

  const rows = (await sql`
    SELECT
      n.id::text                        AS id,
      n.kind,
      COALESCE(a.name, a.email)         AS actor_name,
      COALESCE(t.text, '')              AS todo_text,
      n.read,
      to_char(n.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM notifications n
    JOIN users a ON a.id = n.actor_id
    LEFT JOIN todos t ON t.id = n.todo_id
    WHERE n.user_id = ${userId}::uuid
    ORDER BY n.created_at DESC
    LIMIT ${INBOX_LIMIT}
  `) as {
    id: string;
    kind: AppNotification["kind"];
    actor_name: string;
    todo_text: string;
    read: boolean;
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    actorName: row.actor_name,
    todoText: row.todo_text,
    read: row.read,
    createdAt: row.created_at,
  }));
}

export async function markNotificationsRead(): Promise<void> {
  const userId = await requireUserId();
  await sql`
    UPDATE notifications SET read = true
    WHERE user_id = ${userId}::uuid AND read = false
  `;
  revalidatePath("/");
}
