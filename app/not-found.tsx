import Link from "next/link";

export default function NotFound() {
  return <main className="mx-auto grid min-h-[60vh] max-w-2xl place-content-center px-4 py-12 text-center">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-omd-ops">Not found</p>
    <h1 className="mt-3 text-3xl font-semibold text-slate-950">This page or record is unavailable.</h1>
    <p className="mt-3 text-sm text-slate-600">It may have moved, been removed, or not be available to your account.</p>
    <Link href="/" className="mx-auto mt-6 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Go to homepage</Link>
  </main>;
}
