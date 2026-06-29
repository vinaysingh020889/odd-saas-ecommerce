const topMessages = [
  "Authentic Spiritual Products",
  "Trusted Seva & Guidance",
  "Secure & Easy Checkout",
  "Delivering Across India"
];

const trustItems = [
  { title: "100% Authentic", description: "Curated devotional products" },
  { title: "Secure Payments", description: "Mock gateway in demo mode" },
  { title: "Guided Services", description: "Clear seva journeys" },
  { title: "Devotional Quality", description: "Prepared with care" }
];

export function StorefrontTopStrip({ messages = topMessages }: { messages?: string[] }) {
  return (
    <div className="border-b border-omd-sand/70 bg-omd-brown text-white">
      <div className="mx-auto flex min-h-9 max-w-[min(95vw,1600px)] items-center justify-center gap-4 overflow-hidden px-4 text-center text-xs font-semibold sm:justify-between">
        {messages.map((message, index) => (
          <span key={message} className={index > 1 ? "hidden lg:inline" : index > 0 ? "hidden sm:inline" : "inline"}>
            {message}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TrustFeatureStrip({
  items = trustItems
}: {
  items?: Array<{ title: string; description?: string }>;
}) {
  return (
    <section className="grid gap-3 rounded-2xl border border-omd-sand bg-white/85 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.title} className="rounded-xl bg-omd-ivory/70 p-4">
          <p className="text-sm font-semibold text-omd-brown">{item.title}</p>
          {item.description ? <p className="mt-1 text-xs leading-5 text-omd-muted">{item.description}</p> : null}
        </div>
      ))}
    </section>
  );
}
