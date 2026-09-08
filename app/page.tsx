import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTodos } from "./actions";
import { getCoworkers } from "./coworker-actions";
import { getNotifications } from "./notification-actions";
import TodoList from "./todo-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [todos, coworkers, notifications] = await Promise.all([
    getTodos(),
    getCoworkers(),
    getNotifications(),
  ]);

  return (
    <TodoList
      todos={todos}
      coworkers={coworkers}
      notifications={notifications}
      userName={session.user.name ?? session.user.email ?? "사용자"}
    />
  );
}
