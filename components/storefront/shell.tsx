import type { ReactNode } from "react";

export function StorefrontPageShell({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto w-full max-w-[min(95vw,1600px)] overflow-x-hidden px-4 py-8 sm:px-5 lg:px-6 lg:py-10 ${className}`}>
      {children}
    </main>
  );
}

export function StorefrontSection({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  className = ""
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`grid gap-5 ${className}`}>
      {title || subtitle || action ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-[320px] sm:max-w-3xl">
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1 text-2xl font-semibold tracking-normal text-omd-brown sm:text-3xl">{title}</h2> : null}
            {subtitle ? <p className="mt-2 max-w-[320px] text-sm leading-6 text-omd-muted sm:max-w-3xl">{subtitle}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
