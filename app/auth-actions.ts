"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { sql } from "@/lib/db";

export type AuthFormState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력하세요." };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    throw err;
  }

  redirect("/");
}

export async function signup(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return { error: "올바른 이메일 주소를 입력하세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password !== confirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return { error: "이미 가입된 이메일입니다." };
  }

  const hash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${hash}, ${name || null})
  `;

  await signIn("credentials", { email, password, redirect: false });
  redirect("/");
}
