import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { moderateProductReviewAction } from "@/lib/admin-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ status?: string; rating?: string; q?: string }>;
};

function reviewStatusLabel(status: string) {
  if (status === "pending") return "Pending Review";
  return statusLabel(status);
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const status = (params.status ?? "").trim();
  const rating = Number(params.rating ?? 0);
  const q = (params.q ?? "").trim();
  const reviews = await prisma.productReview.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(rating ? { rating } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { product: { title: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { product: { select: { id: true, title: true, slug: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100
  });

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Catalog" title="Reviews" description="Moderate product reviews before they appear on public product detail pages." tone="admin" />
      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_170px_140px_100px]">
          <input name="q" defaultValue={q} placeholder="Product, customer, title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {["pending", "approved", "rejected"].map((option) => <option key={option} value={option}>{reviewStatusLabel(option)}</option>)}
          </select>
          <select name="rating" defaultValue={rating || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((option) => <option key={option} value={option}>{option} stars</option>)}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white">Filter</button>
        </form>
      </AdminPanel>

      {reviews.length === 0 ? (
        <EmptyState title="No reviews found" description="Customer reviews appear here after submission, or adjust the filters." />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${review.product.id}/edit`} className="font-semibold text-omd-ops">{review.product.title}</Link>
                      <p className="mt-1 text-xs text-slate-500">{review.customerName ?? "Customer"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="font-semibold text-slate-950">{review.title ?? "Untitled review"}</p>
                      <p className="mt-1 max-w-xl">{review.body ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{review.rating}/5</td>
                    <td className="px-4 py-3"><StatusBadge tone={statusTone(review.status)}>{reviewStatusLabel(review.status)}</StatusBadge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {["approved", "rejected", "pending"].map((nextStatus) => (
                          <form key={nextStatus} action={moderateProductReviewAction}>
                            <input type="hidden" name="reviewId" value={review.id} />
                            <input type="hidden" name="status" value={nextStatus} />
                            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold">{reviewStatusLabel(nextStatus)}</button>
                          </form>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
