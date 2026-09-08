"use client";

import { useState, useTransition } from "react";
import { addCoworker, removeCoworker } from "./coworker-actions";
import { FIELD_CLASS } from "@/lib/ui";
import type { Person } from "./types";

export default function CoworkerPanel({ coworkers }: { coworkers: Person[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const value = email.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await addCoworker(value);
      if (result.error) {
        setError(result.error);
        setMessage("");
      } else {
        setEmail("");
        setError("");
        setMessage(`${result.added} 님을 추가하고 알림을 보냈습니다.`);
      }
    });
  }

  return (
    <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <span>
          함께 일하는 사람
          <span className="ml-1.5 text-xs text-zinc-400">
            {coworkers.length}
          </span>
        </span>
        <span className="text-xs text-zinc-400">{open ? "닫기" : "관리"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setMessage("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="가입된 이메일 주소"
              className={`min-w-0 flex-1 ${FIELD_CLASS}`}
            />
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              추가
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {message && <p className="text-xs text-emerald-600">{message}</p>}

          {coworkers.length === 0 ? (
            <p className="py-2 text-xs text-zinc-400">
              추가한 사람이 없습니다. 이 앱에 가입된 이메일만 추가할 수 있습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {coworkers.map((person) => (
                <li
                  key={person.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-800 dark:text-zinc-100">
                      {person.name}
                    </p>
                    <p className="truncate text-[11px] text-zinc-400">
                      {person.email}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      startTransition(() => removeCoworker(person.id))
                    }
                    className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] leading-relaxed text-zinc-400">
            추가하면 상대방에게 알림이 갑니다. 목록에서 빼면 그 사람과 공유하던
            항목의 접근 권한도 함께 사라집니다.
          </p>
        </div>
      )}
    </div>
  );
}
