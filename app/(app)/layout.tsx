import { requireCurrentUser } from "@/lib/auth/session";
import { CustomerHeader } from "@/components/customer-header";

export default async function AppDashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireCurrentUser();

  return (
    <div className="min-h-screen bg-omd-ivory text-omd-brown">
      <CustomerHeader user={user} accountMode />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
