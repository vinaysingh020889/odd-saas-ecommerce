import { saveOfferRuleAction } from "@/lib/admin-actions";

type Target = { id: string; label: string; type: string };

type OfferFormProps = {
  offer?: {
    id: string;
    title: string;
    code: string | null;
    ruleType: string;
    status: string;
    priority: number;
    showInTopMenu: boolean;
    topMenuTitle: string | null;
    startDate: Date | null;
    endDate: Date | null;
    targetScope: string;
    discountKind: string;
    discountValue: unknown;
    minCartValue: unknown;
    maxDiscountAmount: unknown;
    cashbackKind: string | null;
    cashbackValue: unknown;
    usageLimit: number | null;
    perUserLimit: number | null;
    stackWithAutomatic: boolean;
    stackWithCoupon: boolean;
    targets: Array<{ targetType: string; targetId: string }>;
  };
  targets: Target[];
};

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function AdminOfferForm({ offer, targets }: OfferFormProps) {
  const selected = new Set(offer?.targets.map((target) => target.targetId) ?? []);
  const targetType = offer?.targets[0]?.targetType ?? "PRODUCT";

  return (
    <form action={saveOfferRuleAction} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={offer?.id ?? ""} />
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">Title<input name="title" required defaultValue={offer?.title ?? ""} className="h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="grid gap-2 text-sm font-medium">Code<input name="code" defaultValue={offer?.code ?? ""} placeholder="OMD100" className="h-10 rounded-md border border-slate-300 px-3 uppercase" /></label>
        <label className="grid gap-2 text-sm font-medium">Status<select name="status" defaultValue={offer?.status ?? "DRAFT"} className="h-10 rounded-md border border-slate-300 px-3"><option>DRAFT</option><option>ACTIVE</option><option>SCHEDULED</option><option>EXPIRED</option><option>ARCHIVED</option></select></label>
      </div>
      <section className="grid gap-3 rounded-md border border-red-100 bg-red-50/60 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Top menubar offer</p>
          <p className="mt-1 text-sm text-slate-600">Use this offer as the closeable super-top storefront strip. The highest-priority active eligible offer is shown.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
          <label className="flex items-center gap-2 text-sm font-semibold"><input name="showInTopMenu" type="checkbox" defaultChecked={offer?.showInTopMenu ?? false} className="h-4 w-4" /> Show in top menubar</label>
          <label className="grid gap-2 text-sm font-medium">Top menubar title<input name="topMenuTitle" defaultValue={offer?.topMenuTitle ?? ""} placeholder="Flat 25% Cashback - Limited Offer" className="h-10 rounded-md border border-slate-300 px-3" /></label>
        </div>
      </section>
      <aside className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-slate-700">
        <strong>Offer help:</strong> Automatic offers need no code; coupons require a code. An immediate discount lowers today’s payable amount. Cashback is credited to the ODD wallet only after eligible fulfilment. Limits count successful paid orders. “Allow with automatic discounts” lets a coupon combine with an automatic discount.
      </aside>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">Offer application (?)<select name="ruleType" defaultValue={offer?.ruleType ?? "AUTOMATIC"} className="h-10 rounded-md border border-slate-300 px-3"><option value="AUTOMATIC">Automatic</option><option value="COUPON">Coupon</option></select></label>
        <label className="grid gap-2 text-sm font-medium">Priority<input name="priority" type="number" defaultValue={offer?.priority ?? 0} className="h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="grid gap-2 text-sm font-medium">Start<input name="startDate" type="date" defaultValue={dateInput(offer?.startDate)} className="h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="grid gap-2 text-sm font-medium">End<input name="endDate" type="date" defaultValue={dateInput(offer?.endDate)} className="h-10 rounded-md border border-slate-300 px-3" /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <label className="grid gap-2 text-sm font-medium">Immediate discount type (?)<select name="discountKind" defaultValue={offer?.discountKind ?? "PERCENT"} className="h-10 rounded-md border border-slate-300 px-3"><option value="PERCENT">Percent</option><option value="FLAT">Flat</option></select></label>
        <label className="grid gap-2 text-sm font-medium">Discount value<input name="discountValue" type="number" step="0.01" defaultValue={String(offer?.discountValue ?? 0)} className="h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="grid gap-2 text-sm font-medium">Max discount<input name="maxDiscountAmount" type="number" step="0.01" defaultValue={String(offer?.maxDiscountAmount ?? "")} className="h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="grid gap-2 text-sm font-medium">Minimum cart subtotal (?)<input name="minCartValue" type="number" step="0.01" defaultValue={String(offer?.minCartValue ?? 0)} className="h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="grid gap-2 text-sm font-medium">Per-customer limit (?)<input name="perUserLimit" type="number" defaultValue={offer?.perUserLimit ?? ""} className="h-10 rounded-md border border-slate-300 px-3" /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">Cashback type (?)<select name="cashbackKind" defaultValue={offer?.cashbackKind ?? ""} className="h-10 rounded-md border border-slate-300 px-3"><option value="">None</option><option value="PERCENT">Percent</option><option value="FLAT">Flat</option></select></label>
        <label className="grid gap-2 text-sm font-medium">Cashback value<input name="cashbackValue" type="number" step="0.01" defaultValue={String(offer?.cashbackValue ?? "")} className="h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="grid gap-2 text-sm font-medium">Total redemption limit (?)<input name="usageLimit" type="number" defaultValue={offer?.usageLimit ?? ""} className="h-10 rounded-md border border-slate-300 px-3" /></label>
      </div>
      <section className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium">Applies to (?)<select name="targetScope" defaultValue={offer?.targetScope ?? "ALL"} className="h-10 rounded-md border border-slate-300 px-3"><option value="ALL">All cart</option><option value="TARGETED">Targeted</option></select></label>
          <label className="grid gap-2 text-sm font-medium">Target type<select name="targetType" defaultValue={targetType} className="h-10 rounded-md border border-slate-300 px-3"><option>PRODUCT</option><option>CATEGORY</option><option>KIT</option><option>SERVICE</option><option>MEMBERSHIP</option></select></label>
          <div className="grid gap-2 text-sm font-medium">
            Combining offers (?)
            <label className="flex items-center gap-2 text-sm"><input name="stackWithAutomatic" type="checkbox" defaultChecked={offer?.stackWithAutomatic ?? true} /> Allow with automatic discounts</label>
            <input name="stackWithCoupon" type="hidden" value={offer?.stackWithCoupon ? "on" : ""} />
          </div>
        </div>
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-3 md:grid-cols-2">
          {targets.map((target) => (
            <label key={`${target.type}-${target.id}`} className="flex gap-2 text-sm">
              <input name="targetIds" type="checkbox" value={target.id} defaultChecked={selected.has(target.id)} />
              <span><strong>{target.label}</strong> <span className="text-xs text-slate-500">{target.type}</span></span>
            </label>
          ))}
        </div>
      </section>
      <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white">Save offer</button>
    </form>
  );
}
