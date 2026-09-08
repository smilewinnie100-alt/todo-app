"use client";

import { useState } from "react";
import { FIELD_CLASS } from "@/lib/ui";
import type { Kind, Person, Priority, Todo, TodoInput } from "./types";

const KINDS: { key: Kind; label: string }[] = [
  { key: "task", label: "할 일" },
  { key: "event", label: "일정" },
];

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function emptyInput(): TodoInput {
  return {
    kind: "task",
    text: "",
    dueDate: "",
    startTime: "",
    endTime: "",
    priority: "medium",
    shareWith: [],
  };
}

export function inputFromTodo(todo: Todo): TodoInput {
  return {
    kind: todo.kind,
    text: todo.text,
    dueDate: todo.dueDate,
    startTime: todo.startTime,
    endTime: todo.endTime,
    priority: todo.priority,
    shareWith: todo.sharedWith.map((person) => person.id),
  };
}

export default function TodoForm({
  initial,
  coworkers,
  canShare,
  submitLabel,
  pending,
  resetOnSuccess = false,
  onSubmit,
  onCancel,
}: {
  initial: TodoInput;
  coworkers: Person[];
  /** Only an item's owner decides who it is shared with. */
  canShare: boolean;
  submitLabel: string;
  pending: boolean;
  /** True for the "add" form, which starts empty again after each item. */
  resetOnSuccess?: boolean;
  onSubmit: (input: TodoInput) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<TodoInput>(initial);
  const [error, setError] = useState("");

  function set<K extends keyof TodoInput>(key: K, next: TodoInput[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
    setError("");
  }

  function toggleShare(id: string) {
    setValue((prev) => ({
      ...prev,
      shareWith: prev.shareWith.includes(id)
        ? prev.shareWith.filter((other) => other !== id)
        : [...prev.shareWith, id],
    }));
  }

  async function submit() {
    const problem = await onSubmit(value);
    if (problem) {
      setError(problem);
      return;
    }
    // Keep the chosen kind — adding several events in a row is common.
    if (resetOnSuccess) setValue({ ...emptyInput(), kind: value.kind });
  }

  const isEvent = value.kind === "event";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => set("kind", k.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              value.kind === k.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <input
        value={value.text}
        onChange={(e) => set("text", e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isEvent) submit();
        }}
        placeholder={isEvent ? "일정 이름 (예: 팀 회의)" : "할 일을 입력하세요"}
        className={FIELD_CLASS}
      />

      {isEvent ? (
        <>
          <Field label="날짜">
            <input
              type="date"
              value={value.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              className={`w-full ${FIELD_CLASS}`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="시작 시간">
              <input
                type="time"
                value={value.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className={`w-full ${FIELD_CLASS}`}
              />
            </Field>
            <Field label="종료 시간">
              <input
                type="time"
                value={value.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className={`w-full ${FIELD_CLASS}`}
              />
            </Field>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="마감일">
            <input
              type="date"
              value={value.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              className={`w-full ${FIELD_CLASS}`}
            />
          </Field>
          <Field label="마감시간">
            <input
              type="time"
              value={value.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              className={`w-full ${FIELD_CLASS}`}
            />
          </Field>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Field label="우선순위" className="flex-1">
          <select
            value={value.priority}
            onChange={(e) => set("priority", e.target.value as Priority)}
            className={`w-full ${FIELD_CLASS}`}
          >
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </Field>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            취소
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitLabel}
        </button>
      </div>

      {canShare && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-zinc-400">
            함께 볼 사람
          </span>
          {coworkers.length === 0 ? (
            <p className="text-xs text-zinc-400">
              아직 co-worker가 없습니다. 아래 &quot;함께 일하는 사람&quot;에서
              이메일로 추가하세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {coworkers.map((person) => {
                const picked = value.shareWith.includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => toggleShare(person.id)}
                    title={person.email}
                    className={`max-w-40 truncate rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      picked
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {picked ? "✓ " : ""}
                    {person.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
