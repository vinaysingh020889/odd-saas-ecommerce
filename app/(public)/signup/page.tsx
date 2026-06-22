import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { signupAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <section className="rounded-lg border border-omd-sand bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Public access</p>
      <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Signup</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">
        Create a customer account for the OMDivyaDarshan app.
      </p>
      <AuthForm mode="signup" action={signupAction} />
      <p className="mt-5 text-sm text-omd-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-omd-saffron hover:text-omd-brown">
          Login
        </Link>
      </p>
    </section>
  );
}
