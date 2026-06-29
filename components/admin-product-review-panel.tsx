import { moderateProductReviewAction } from "@/lib/admin-actions";
import { AdminPanel, StatusBadge } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  customerName: string | null;
  status: string;
  isVerifiedPurchase: boolean;
  createdAt: Date;
};

function reviewStatusLabel(status: string) {
  if (status === "pending") return "Pending Review";
  return statusLabel(status);
}

export function AdminProductReviewPanel({ reviews }: { reviews: ReviewRow[] }) {
  const approved = reviews.filter((review) => review.status === "approved");
  const average = approved.length ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length : 0;

  return (
    <AdminPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Reviews</h2>
          <p className="mt-2 text-sm text-slate-600">Moderate customer reviews for this product. Public pages show approved reviews only.</p>
        </div>
        <StatusBadge tone="ops">{approved.length ? `${average.toFixed(1)} avg` : "No approved reviews"}</StatusBadge>
      </div>

      <div className="mt-5 grid gap-3">
        {reviews.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No reviews yet.
          </div>
        ) : null}
        {reviews.map((review) => (
          <article key={review.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{review.title ?? `${review.rating}/5 rating`}</p>
                <p className="mt-1 text-sm text-slate-600">{review.customerName ?? "Customer"} - {review.createdAt.toLocaleDateString("en-IN")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={statusTone(review.status)}>{reviewStatusLabel(review.status)}</StatusBadge>
                {review.isVerifiedPurchase ? <StatusBadge tone="success">Verified</StatusBadge> : null}
              </div>
            </div>
            {review.body ? <p className="mt-3 text-sm leading-6 text-slate-700">{review.body}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {["approved", "rejected", "pending"].map((status) => (
                <form key={status} action={moderateProductReviewAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="status" value={status} />
                  <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops">
                    Mark {reviewStatusLabel(status)}
                  </button>
                </form>
              ))}
            </div>
          </article>
        ))}
      </div>
    </AdminPanel>
  );
}
