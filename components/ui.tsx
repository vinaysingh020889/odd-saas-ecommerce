import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: "customer" | "admin";
};

export function PageHeader({ eyebrow, title, description, actions, tone = "customer" }: PageHeaderProps) {
  if (tone === "admin") {
    return (
      <section className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="text-xs font-semibold uppercase tracking-wide text-omd-ops">{eyebrow}</nav>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div> : null}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-omd-sand/80 bg-white/80 p-5 shadow-sm md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-omd-brown md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-omd-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}

export function BreadcrumbHeader({
  items,
  title,
  actions
}: {
  items: Array<{ label: string; href?: string }>;
  title?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-omd-muted" aria-label="Breadcrumb">
          {items.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href ? (
                <Link href={item.href} className="font-semibold hover:text-omd-saffron">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
              {index < items.length - 1 ? <span className="text-omd-sand">/</span> : null}
            </span>
          ))}
        </nav>
        {title ? <h1 className="mt-2 text-2xl font-semibold text-omd-brown md:text-3xl">{title}</h1> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-omd-sand/80 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function AdminPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "error" | "ops" }) {
  const toneClass = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-green-100 bg-green-50 text-omd-success",
    warning: "border-amber-100 bg-amber-50 text-omd-saffron",
    error: "border-red-100 bg-red-50 text-omd-error",
    ops: "border-blue-100 bg-blue-50 text-omd-ops"
  }[tone];

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Panel className="p-8 text-center">
      <h2 className="text-xl font-semibold text-omd-brown">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-omd-muted">{description}</p>
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </Panel>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex justify-center rounded-md border border-omd-sand px-4 py-2 text-sm font-semibold text-omd-brown hover:border-omd-gold">
      {children}
    </Link>
  );
}

export function SummaryRow({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "font-semibold text-omd-brown" : "text-sm text-omd-muted"}`}>
      <span>{label}</span>
      <span className={strong ? "text-omd-brown" : "font-semibold text-omd-brown"}>{value}</span>
    </div>
  );
}
