import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <section className="rounded-lg border border-omd-sand bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Public access</p>
      <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Login</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">
        Access your OMDivyaDarshan customer dashboard.
      </p>
      <AuthForm mode="login" action={loginAction} />
      <p className="mt-5 text-sm text-omd-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-omd-saffron hover:text-omd-brown">
          Create an account
        </Link>
      </p>
    </section>
  );
}
