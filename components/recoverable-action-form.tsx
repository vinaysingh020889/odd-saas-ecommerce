"use client";

import { useActionState } from "react";
import type { RecoverableActionState } from "@/lib/action-state";

const initialState: RecoverableActionState = { status: "idle" };

export function RecoverableActionForm({ action, children, className, buttonClassName, buttonLabel, pendingLabel = "Working..." }: {
  action: (state: RecoverableActionState, formData: FormData) => Promise<RecoverableActionState>;
  children: React.ReactNode;
  className?: string;
  buttonClassName: string;
  buttonLabel: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return <form action={formAction} className={className}>
    {children}
    <button disabled={pending} className={buttonClassName}>{pending ? pendingLabel : buttonLabel}</button>
    {state.status !== "idle" ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>
      {state.message}{state.errorRef ? <> Reference: <span className="font-mono">{state.errorRef}</span>.</> : null}
    </p> : null}
  </form>;
}
