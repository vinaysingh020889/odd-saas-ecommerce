import type { ReactNode } from "react";

export function StorefrontPageShell({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto w-full max-w-[min(95vw,1600px)] px-4 py-4 sm:px-5 lg:px-6 lg:py-5 ${className}`}>
      {children}
    </main>
  );
}

export function StorefrontSection({
  title,
  subtitle,
  action,
  children,
  className = ""
}: {
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`grid gap-5 ${className}`}>
      {title || subtitle || action ? (
        <div className="mx-auto grid w-full max-w-4xl justify-items-center gap-3 text-center">
          {title ? <h2 className="text-3xl font-bold leading-tight tracking-normal text-[#173331] sm:text-4xl lg:text-5xl">{title}</h2> : null}
          {subtitle ? <p className="max-w-2xl text-sm leading-6 text-omd-muted sm:text-base">{subtitle}</p> : null}
          {action ? <div className="flex flex-wrap justify-center gap-2 pt-1">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
