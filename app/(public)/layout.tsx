import { getCurrentUser } from "@/lib/auth/session";
import { CustomerHeader } from "@/components/customer-header";
import { StorefrontPageShell, StorefrontTopStrip } from "@/components/storefront";

export default async function PublicCustomerLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-omd-ivory text-omd-brown">
      <StorefrontTopStrip />
      <CustomerHeader user={user} />
      <StorefrontPageShell>{children}</StorefrontPageShell>
    </div>
  );
}
