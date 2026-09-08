import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { login } from "../auth-actions";
import AuthForm from "../auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return <AuthForm mode="login" action={login} />;
}
