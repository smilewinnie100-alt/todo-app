"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import type { Person } from "./types";

export type CoworkerResult = { error?: string; added?: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getCoworkers(): Promise<Person[]> {
  const userId = await requireUserId();

  return (await sql`
    SELECT u.id::text AS id, COALESCE(u.name, u.email) AS name, u.email
    FROM coworkers c
    JOIN users u ON u.id = c.coworker_id
    WHERE c.owner_id = ${userId}::uuid
    ORDER BY name
  `) as Person[];
}

/**
 * Adds a registered user to the caller's co-worker list by email and tells them
 * about it. No acceptance step — the list only lets the owner share *their* own
 * items outward, it grants no read access in the other direction.
 */
export async function addCoworker(rawEmail: string): Promise<CoworkerResult> {
  const userId = await requireUserId();
  const email = rawEmail.trim().toLowerCase();

  if (!email) return { error: "이메일을 입력하세요." };

  const found = (await sql`
    SELECT id::text AS id, COALESCE(name, email) AS name
    FROM users
    WHERE lower(email) = ${email}
  `) as { id: string; name: string }[];

  const person = found[0];
  if (!person) return { error: "이 앱에 가입된 사용자가 아닙니다." };
  if (person.id === userId) return { error: "본인은 추가할 수 없습니다." };

  const inserted = await sql`
    INSERT INTO coworkers (owner_id, coworker_id)
    VALUES (${userId}::uuid, ${person.id}::uuid)
    ON CONFLICT (owner_id, coworker_id) DO NOTHING
    RETURNING coworker_id
  `;

  if (inserted.length === 0) {
    return { error: "이미 co-worker 목록에 있습니다." };
  }

  await sql`
    INSERT INTO notifications (user_id, actor_id, kind)
    VALUES (${person.id}::uuid, ${userId}::uuid, 'coworker_added')
  `;

  revalidatePath("/");
  return { added: person.name };
}

/**
 * Removing someone also revokes every item the caller had shared with them —
 * leaving the shares behind would keep access alive after the relationship ends.
 */
export async function removeCoworker(coworkerId: string): Promise<void> {
  const userId = await requireUserId();

  await sql`
    DELETE FROM coworkers
    WHERE owner_id = ${userId}::uuid AND coworker_id = ${coworkerId}::uuid
  `;

  await sql`
    WITH revoked AS (
      DELETE FROM todo_shares s
      USING todos t
      WHERE s.todo_id = t.id
        AND t.user_id = ${userId}
        AND s.user_id = ${coworkerId}::uuid
      RETURNING s.todo_id, s.user_id
    )
    INSERT INTO notifications (user_id, actor_id, todo_id, kind)
    SELECT user_id, ${userId}::uuid, todo_id, 'todo_unshared' FROM revoked
  `;

  revalidatePath("/");
}
