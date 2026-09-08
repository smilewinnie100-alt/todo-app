import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTodos } from "./actions";
import TodoList from "./todo-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const todos = await getTodos();
  return (
    <TodoList
      todos={todos}
      userName={session.user.name ?? session.user.email ?? "사용자"}
    />
  );
}
