"use client";

import { useState, useTransition } from "react";
import { markNotificationsRead } from "./notification-actions";
import type { AppNotification } from "./types";

function describe(item: AppNotification): string {
  switch (item.kind) {
    case "coworker_added":
      return `${item.actorName} 님이 회원님을 co-worker로 추가했습니다.`;
    case "todo_shared":
      return `${item.actorName} 님이 "${item.todoText}" 를 공유했습니다.`;
    case "todo_unshared":
      return `${item.actorName} 님이 "${item.todoText}" 공유를 해제했습니다.`;
  }
}

function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function NotificationBell({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const unread = notifications.filter((item) => !item.read).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      startTransition(() => markNotificationsRead());
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="알림"
        className="relative rounded px-1 text-sm text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        알림
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-zinc-100 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-zinc-400">
              알림이 없습니다.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg px-2 py-2 text-xs leading-relaxed ${
                    item.read
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "bg-indigo-50 text-zinc-800 dark:bg-indigo-500/10 dark:text-zinc-100"
                  }`}
                >
                  <p className="break-words">{describe(item)}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    {relativeTime(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
