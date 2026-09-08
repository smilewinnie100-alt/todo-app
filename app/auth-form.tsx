"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FIELD_CLASS } from "@/lib/ui";
import type { AuthFormState } from "./auth-actions";

type Props = {
  mode: "login" | "signup";
  action: (
    prev: AuthFormState,
    formData: FormData
  ) => Promise<AuthFormState>;
};

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const isSignup = mode === "signup";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {isSignup ? "회원가입" : "로그인"}
        </h1>
        <p className="mt-2 mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          {isSignup
            ? "가입하면 내 할 일만 따로 관리할 수 있습니다."
            : "할 일 목록에 로그인하세요."}
        </p>

        <form action={formAction} className="flex flex-col gap-3">
          {isSignup && (
            <input
              name="name"
              type="text"
              placeholder="이름 (선택)"
              autoComplete="name"
              className={`w-full ${FIELD_CLASS}`}
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="이메일"
            autoComplete="email"
            required
            className={`w-full ${FIELD_CLASS}`}
          />
          <input
            name="password"
            type="password"
            placeholder={isSignup ? "비밀번호 (8자 이상)" : "비밀번호"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            className={`w-full ${FIELD_CLASS}`}
          />
          {isSignup && (
            <input
              name="confirm"
              type="password"
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              required
              className={`w-full ${FIELD_CLASS}`}
            />
          )}

          {state.error && (
            <p className="text-xs font-medium text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
          >
            {isPending ? "처리 중…" : isSignup ? "가입하기" : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          {isSignup ? (
            <>
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="font-medium text-zinc-700 hover:underline dark:text-zinc-200"
              >
                로그인
              </Link>
            </>
          ) : (
            <>
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="font-medium text-zinc-700 hover:underline dark:text-zinc-200"
              >
                회원가입
              </Link>
            </>
          )}
        </p>
      </main>
    </div>
  );
}
