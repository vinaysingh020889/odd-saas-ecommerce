"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

export function RouteError({ error, reset, destination = "/", destinationLabel = "Go to safety" }: {
  error: Error & { digest?: string };
  reset: () => void;
  destination?: string;
  destinationLabel?: string;
}) {
  const errorRef = useMemo(() => error.digest ? `OMD-${error.digest.slice(0, 12).toUpperCase()}` : "OMD-UNEXPECTED", [error.digest]);
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", event: "route_render_failed", errorRef }));
  }, [errorRef]);
  return <main className="mx-auto grid min-h-[60vh] max-w-2xl place-content-center px-4 py-12 text-center">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-omd-ops">Something went wrong</p>
    <h1 className="mt-3 text-3xl font-semibold text-slate-950">The page could not complete your request.</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">No completed change is being claimed. Retry once, or return to a safe page and share the reference below with support.</p>
    <p className="mt-4 font-mono text-sm text-slate-700">Reference: {errorRef}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button onClick={reset} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      <button onClick={() => history.back()} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Back</button>
      <Link href={destination} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">{destinationLabel}</Link>
    </div>
  </main>;
}
