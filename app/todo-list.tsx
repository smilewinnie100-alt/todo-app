"use client";

import { useEffect, useState, useTransition } from "react";
import { addTodo, deleteTodo, logout, toggleTodo, updateTodo } from "./actions";
import CoworkerPanel from "./coworker-panel";
import DateBanner from "./date-banner";
import NotificationBell from "./notification-bell";
import TodoForm, { emptyInput, inputFromTodo } from "./todo-form";
import { nowTimeStr, todayStr } from "@/lib/date";
import { getUpcomingHolidays } from "@/lib/holidays";
import type { AppNotification, Person, Priority, Todo } from "./types";

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

/** Events are anchored by their start; tasks by their deadline. */
function startsAt(todo: Todo): string {
  return todo.kind === "event" ? todo.startTime : todo.endTime;
}

/** Sortable "when", with undated items pushed behind dated ones. */
function whenKey(todo: Todo): string {
  if (!todo.dueDate) return "";
  return `${todo.dueDate} ${startsAt(todo) || "99:99"}`;
}

function whenLabel(todo: Todo): string {
  if (!todo.dueDate) return "";
  if (todo.kind === "event") {
    return `${todo.dueDate} ${todo.startTime}–${todo.endTime}`;
  }
  return todo.endTime
    ? `${todo.dueDate} ${todo.endTime}까지`
    : `${todo.dueDate}까지`;
}

export default function TodoList({
  todos,
  coworkers,
  notifications,
  userName,
}: {
  todos: Todo[];
  coworkers: Person[];
  notifications: AppNotification[];
  userName: string;
}) {
  const [tab, setTab] = useState<Tab>("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Resolved after mount only: the server render and the first client render
  // have to agree, and "now" would differ between them.
  const [nowTime, setNowTime] = useState("");
  useEffect(() => {
    const tick = () => setNowTime(nowTimeStr());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  const remaining = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - remaining;
  const today = todayStr();
  const holidays = getUpcomingHolidays(today, 2);

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    const keyA = whenKey(a);
    const keyB = whenKey(b);
    if (keyA && keyB) return keyA.localeCompare(keyB);
    if (keyA) return -1;
    if (keyB) return 1;
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
            <NotificationBell notifications={notifications} />
            <span className="max-w-24 truncate text-xs text-zinc-400">
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

        <div className="mb-4">
          <TodoForm
            initial={emptyInput()}
            coworkers={coworkers}
            canShare
            submitLabel="추가"
            pending={isPending}
            resetOnSuccess
            onSubmit={async (input) => {
              const result = await addTodo(input);
              return result.error ?? null;
            }}
          />
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
              if (editingId === todo.id) {
                return (
                  <li
                    key={todo.id}
                    className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60"
                  >
                    <TodoForm
                      initial={inputFromTodo(todo)}
                      coworkers={coworkers}
                      canShare={todo.isOwner}
                      submitLabel="저장"
                      pending={isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (input) => {
                        const result = await updateTodo(todo.id, input);
                        if (result.error) return result.error;
                        setEditingId(null);
                        return null;
                      }}
                    />
                  </li>
                );
              }

              const deadline = todo.endTime;
              const overdue =
                !todo.done &&
                !!todo.dueDate &&
                (todo.dueDate < today ||
                  (todo.dueDate === today &&
                    !!deadline &&
                    !!nowTime &&
                    deadline < nowTime));

              return (
                <li
                  key={todo.id}
                  className="group flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => startTransition(() => toggleTodo(todo.id))}
                    className="mt-1 h-4 w-4 shrink-0 accent-zinc-900 dark:accent-zinc-50"
                  />
                  <div className="min-w-0 flex-1">
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
                      {todo.kind === "event" && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          일정
                        </span>
                      )}
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
                          {whenLabel(todo)}
                          {overdue ? " 지남" : ""}
                        </span>
                      )}
                      {!todo.isOwner && (
                        <span className="text-[11px] text-zinc-400">
                          {todo.ownerName} 님이 공유
                        </span>
                      )}
                      {todo.isOwner && todo.sharedWith.length > 0 && (
                        <span
                          className="text-[11px] text-zinc-400"
                          title={todo.sharedWith
                            .map((person) => person.email)
                            .join(", ")}
                        >
                          공유 중 ·{" "}
                          {todo.sharedWith
                            .map((person) => person.name)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setEditingId(todo.id)}
                      className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => startTransition(() => deleteTodo(todo.id))}
                      aria-label="삭제"
                      className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-red-500"
                    >
                      삭제
                    </button>
                  </div>
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

        <CoworkerPanel coworkers={coworkers} />
      </main>
    </div>
  );
}
