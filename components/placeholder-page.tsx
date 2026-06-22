type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "customer" | "app" | "admin";
};

const toneClasses = {
  customer: "border-omd-sand bg-white",
  app: "border-omd-gold bg-white",
  admin: "border-omd-ops bg-white"
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  tone = "customer"
}: PlaceholderPageProps) {
  return (
    <section className={`rounded-lg border p-8 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-inherit">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">{description}</p>
    </section>
  );
}
