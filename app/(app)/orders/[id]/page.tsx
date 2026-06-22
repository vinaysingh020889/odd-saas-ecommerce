import { PlaceholderPage } from "@/components/placeholder-page";
import { requireCurrentUser } from "@/lib/auth/session";

type OrderPageProps = {
  params: {
    id: string;
  };
};

export default async function OrderPage({ params }: OrderPageProps) {
  await requireCurrentUser();

  return (
    <PlaceholderPage
      eyebrow="Customer app"
      title={`Order: ${params.id}`}
      description="Order detail placeholder. No order business logic is active in Phase 0."
      tone="app"
    />
  );
}
