export type Priority = "low" | "medium" | "high";

/**
 * "task" is a to-do: an optional due date plus an optional deadline time.
 * "event" is a scheduled block (a meeting, say): a date with start and end times.
 */
export type Kind = "task" | "event";

export type Todo = {
  id: string;
  kind: Kind;
  text: string;
  done: boolean;
  dueDate: string; // yyyy-mm-dd, empty string if none
  startTime: string; // HH:MM, events only; empty string if none
  endTime: string; // HH:MM — task: 마감시간, event: 종료시간; empty string if none
  priority: Priority;
  /** False when someone else owns this item and shared it with the viewer. */
  isOwner: boolean;
  ownerName: string;
  /** Everyone the item is shared with, owner excluded. */
  sharedWith: Person[];
};

export type Person = {
  id: string;
  name: string;
  email: string;
};

export type NotificationKind =
  | "coworker_added"
  | "todo_shared"
  | "todo_unshared";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  actorName: string;
  todoText: string;
  read: boolean;
  createdAt: string; // ISO 8601
};

/** Shape the add/edit form posts to the server. */
export type TodoInput = {
  kind: Kind;
  text: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  priority: Priority;
  /** User ids to share with — must all be in the caller's co-worker list. */
  shareWith: string[];
};
