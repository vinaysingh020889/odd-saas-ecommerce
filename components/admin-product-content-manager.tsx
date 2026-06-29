import {
  removeProductContentBlockAction,
  removeProductFaqAction,
  removeProductSpecAction,
  saveProductContentBlockAction,
  saveProductFaqAction,
  saveProductSpecAction
} from "@/lib/admin-actions";
import { AdminPanel, StatusBadge } from "@/components/ui";

type ProductContentManagerProps = {
  productId: string;
  specs: Array<{ id: string; label: string; value: string; groupName: string | null; sortOrder: number }>;
  faqs: Array<{ id: string; question: string; answer: string; status: string; sortOrder: number }>;
  contentBlocks: Array<{ id: string; blockType: string; title: string; body: string; itemsJson: unknown; status: string; sortOrder: number }>;
};

function DeleteButton({ id, action }: { id: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs font-semibold text-omd-error">Remove</button>
    </form>
  );
}

export function AdminProductContentManager({ productId, specs, faqs, contentBlocks }: ProductContentManagerProps) {
  return (
    <AdminPanel className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Premium PDP Content</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Specs, FAQs and Content Blocks</h2>
        </div>
        <StatusBadge tone={specs.length || faqs.length || contentBlocks.length ? "success" : "warning"}>
          {specs.length + faqs.length + contentBlocks.length} records
        </StatusBadge>
      </div>

      <section className="grid gap-3">
        <h3 className="font-semibold text-slate-950">Product specs</h3>
        {specs.map((spec) => (
          <div key={spec.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <span><strong>{spec.label}</strong>: {spec.value} {spec.groupName ? <span className="text-slate-500">({spec.groupName})</span> : null}</span>
            <DeleteButton id={spec.id} action={removeProductSpecAction} />
          </div>
        ))}
        <form action={saveProductSpecAction} className="grid gap-3 rounded-md border border-dashed border-slate-300 p-3 md:grid-cols-[1fr_1fr_140px_100px_auto]">
          <input type="hidden" name="productId" value={productId} />
          <input name="label" placeholder="Pack Type" required className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input name="value" placeholder="Box Pack" required className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input name="groupName" placeholder="Group" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input name="sortOrder" type="number" placeholder="0" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white">Add</button>
        </form>
      </section>

      <section className="grid gap-3">
        <h3 className="font-semibold text-slate-950">FAQs</h3>
        {faqs.map((faq) => (
          <div key={faq.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <strong>{faq.question}</strong>
              <DeleteButton id={faq.id} action={removeProductFaqAction} />
            </div>
            <p className="mt-2 text-slate-600">{faq.answer}</p>
          </div>
        ))}
        <form action={saveProductFaqAction} className="grid gap-3 rounded-md border border-dashed border-slate-300 p-3">
          <input type="hidden" name="productId" value={productId} />
          <input name="question" placeholder="Question" required className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <textarea name="answer" placeholder="Answer" required className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="grid gap-3 md:grid-cols-[140px_120px_auto]">
            <select name="status" defaultValue="ACTIVE" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <input name="sortOrder" type="number" placeholder="0" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <button className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white">Add FAQ</button>
          </div>
        </form>
      </section>

      <section className="grid gap-3">
        <h3 className="font-semibold text-slate-950">Content blocks</h3>
        {contentBlocks.map((block) => (
          <div key={block.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <strong>{block.title}</strong>
              <DeleteButton id={block.id} action={removeProductContentBlockAction} />
            </div>
            <p className="mt-1 text-xs uppercase text-slate-500">{block.blockType}</p>
            <p className="mt-2 text-slate-600">{block.body}</p>
          </div>
        ))}
        <form action={saveProductContentBlockAction} className="grid gap-3 rounded-md border border-dashed border-slate-300 p-3">
          <input type="hidden" name="productId" value={productId} />
          <div className="grid gap-3 md:grid-cols-[180px_1fr_100px]">
            <select name="blockType" defaultValue="HOW_TO_USE" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              <option value="HOW_TO_USE">How to Use</option>
              <option value="WHATS_INSIDE">What&apos;s Inside</option>
              <option value="CARE">Care</option>
              <option value="RITUAL_NOTE">Ritual Note</option>
              <option value="DETAIL">Detail</option>
            </select>
            <input name="title" placeholder="Section title" required className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <input name="sortOrder" type="number" placeholder="0" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          </div>
          <textarea name="body" placeholder="Body" required className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea name="items" placeholder="Optional bullet items, one per line" className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="w-fit rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white">Add block</button>
        </form>
      </section>
    </AdminPanel>
  );
}
