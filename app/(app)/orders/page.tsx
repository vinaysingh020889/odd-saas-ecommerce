import { PlaceholderPage } from "@/components/placeholder-page";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function OrdersPage() {
  await requireCurrentUser();

  return (
    <PlaceholderPage
      eyebrow="Customer app"
      title="Orders"
      description="Customer orders placeholder. Order records and fulfillment state will be wired in a later phase."
      tone="app"
    />
  );
}
