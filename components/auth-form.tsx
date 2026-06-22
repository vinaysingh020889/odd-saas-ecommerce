"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { AuthActionState } from "@/lib/auth/actions";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (previousState: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-omd-brown px-5 text-sm font-semibold text-white transition hover:bg-omd-saffron disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Please wait" : label}
    </button>
  );
}

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction] = useFormState(action, {});
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="mt-6 grid max-w-md gap-4">
      {isSignup ? (
        <label className="grid gap-2 text-sm font-medium text-omd-brown">
          Name
          <input
            name="name"
            autoComplete="name"
            className="h-11 rounded-md border border-omd-sand bg-white px-3 text-base font-normal outline-none focus:border-omd-gold"
            required
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-omd-brown">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          className="h-11 rounded-md border border-omd-sand bg-white px-3 text-base font-normal outline-none focus:border-omd-gold"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-omd-brown">
        Password
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          className="h-11 rounded-md border border-omd-sand bg-white px-3 text-base font-normal outline-none focus:border-omd-gold"
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-md border border-omd-error/30 bg-red-50 px-3 py-2 text-sm text-omd-error">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={isSignup ? "Create account" : "Login"} />
    </form>
  );
}
