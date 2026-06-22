import { getWalletQuote } from "@/lib/wallet-client";
import { PlaceholderPage } from "@/components/placeholder-page";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function WalletPage() {
  await requireCurrentUser();
  const quote = await getWalletQuote();

  return (
    <PlaceholderPage
      eyebrow="Customer app"
      title="Wallet"
      description={`Wallet boundary is present and currently ${quote.status}. Ledger and live wallet flows are not implemented.`}
      tone="app"
    />
  );
}
