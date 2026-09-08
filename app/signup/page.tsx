import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signup } from "../auth-actions";
import AuthForm from "../auth-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return <AuthForm mode="signup" action={signup} />;
}
