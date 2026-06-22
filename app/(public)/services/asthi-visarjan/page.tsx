import Link from "next/link";

export default function AsthiVisarjanServicePage() {
  return (
    <section className="rounded-lg border border-omd-sand bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Services</p>
      <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Asthi Visarjan</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-omd-muted">
        Asthi Visarjan service detail placeholder. Application intake, documents, payment, case status, capacity, and fulfillment workflows are not implemented in Phase 2.
      </p>
      <Link
        href="/asthi/apply"
        className="mt-6 inline-flex rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron"
      >
        Application placeholder
      </Link>
    </section>
  );
}
