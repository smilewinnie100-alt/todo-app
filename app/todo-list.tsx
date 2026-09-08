"use client";

import { useState, useTransition } from "react";
import { addTodo, deleteTodo, logout, toggleTodo } from "./actions";
import DateBanner from "./date-banner";
import { todayStr } from "@/lib/date";
import { getUpcomingHolidays } from "@/lib/holidays";
import { FIELD_CLASS } from "@/lib/ui";
import type { Priority, Todo } from "./types";

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  medium:
    "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  low: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

type Tab = "active" | "done" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "active", label: "진행중" },
  { key: "done", label: "완료" },
  { key: "all", label: "전체" },
];

export default function TodoList({
  todos,
  userName,
}: {
  todos: Todo[];
  userName: string;
}) {
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tab, setTab] = useState<Tab>("active");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const text = input.trim();
    if (!text) return;
    startTransition(async () => {
      await addTodo(text, dueDate, priority);
      setInput("");
      setDueDate("");
      setPriority("medium");
    });
  }

  const remaining = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - remaining;
  const today = todayStr();
  const holidays = getUpcomingHolidays(today, 2);

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const visibleTodos = sortedTodos.filter((t) => {
    if (tab === "active") return !t.done;
    if (tab === "done") return t.done;
    return true;
  });

  return (
    <div className="flex flex-1 items-start justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
        <div className="mb-6 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            할 일 목록
          </h1>
          <div className="flex shrink-0 items-baseline gap-2">
            <span className="max-w-28 truncate text-xs text-zinc-400">
              {userName}
            </span>
            <button
              onClick={() => startTransition(() => logout())}
              className="rounded px-1 text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              로그아웃
            </button>
          </div>
        </div>

        <DateBanner today={today} holidays={holidays} />

        <div className="mb-4 flex flex-col gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="할 일을 입력하세요"
            className={FIELD_CLASS}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`flex-1 ${FIELD_CLASS}`}
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className={FIELD_CLASS}
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              추가
            </button>
          </div>
        </div>

        <div className="mb-3 flex gap-1 border-b border-zinc-100 dark:border-zinc-800">
          {TABS.map((t) => {
            const count =
              t.key === "active"
                ? remaining
                : t.key === "done"
                  ? doneCount
                  : todos.length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                    : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                {t.label}
                <span className="text-xs text-zinc-400">{count}</span>
              </button>
            );
          })}
        </div>

        {visibleTodos.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            {tab === "active"
              ? "진행중인 할 일이 없습니다."
              : tab === "done"
                ? "완료한 할 일이 없습니다."
                : "아직 할 일이 없습니다."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {visibleTodos.map((todo) => {
              const overdue =
                !todo.done && !!todo.dueDate && todo.dueDate < today;
              return (
                <li
                  key={todo.id}
                  className="group flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() =>
                      startTransition(() => toggleTodo(todo.id))
                    }
                    className="mt-1 h-4 w-4 shrink-0 accent-zinc-900 dark:accent-zinc-50"
                  />
                  <div className="flex-1">
                    <span
                      className={`break-words text-sm ${
                        todo.done
                          ? "text-zinc-400 line-through"
                          : "text-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      {todo.text}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[todo.priority]}`}
                      >
                        {PRIORITY_LABEL[todo.priority]}
                      </span>
                      {todo.dueDate && (
                        <span
                          className={`text-[11px] ${
                            overdue
                              ? "font-medium text-red-500"
                              : "text-zinc-400"
                          }`}
                        >
                          {todo.dueDate}
                          {overdue ? " 지남" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => startTransition(() => deleteTodo(todo.id))}
                    aria-label="삭제"
                    className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {todos.length > 0 && (
          <p className="mt-4 text-xs text-zinc-400">
            {remaining}개 남음 / 전체 {todos.length}개
          </p>
        )}
      </main>
    </div>
  );
}
