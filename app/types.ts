export type Priority = "low" | "medium" | "high";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  dueDate: string; // yyyy-mm-dd, empty string if none
  priority: Priority;
};
