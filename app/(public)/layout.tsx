import { getCurrentUser } from "@/lib/auth/session";
import { CustomerHeader } from "@/components/customer-header";
import { StorefrontFooter, StorefrontPageShell } from "@/components/storefront";

export default async function PublicCustomerLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen overflow-x-hidden bg-omd-ivory text-omd-brown">
      <CustomerHeader user={user} />
      <StorefrontPageShell>{children}</StorefrontPageShell>
      <StorefrontFooter />
    </div>
  );
}
