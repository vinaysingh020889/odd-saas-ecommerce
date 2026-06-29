import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { deleteCustomerAddressAction, saveCustomerAddressAction, setDefaultCustomerAddressAction } from "@/lib/address-actions";
import { buildAddressText } from "@/lib/checkout-maturity";
import { BreadcrumbHeader, EmptyState, Panel, StatusBadge } from "@/components/ui";

export default async function AddressesPage() {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const addresses = await prisma.customerAddress.findMany({
    where: { tenantId, userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
  });

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Addresses" }]}
        title="Address Book"
        actions={<StatusBadge tone="neutral">{addresses.length} saved</StatusBadge>}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-4">
          {addresses.length === 0 ? (
            <EmptyState
              title="No saved addresses"
              description="Add a delivery address once and reuse it during checkout. Orders still keep their own frozen address snapshot."
            />
          ) : null}

          {addresses.map((address) => (
            <Panel key={address.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-omd-brown">{address.fullName}</h2>
                    {address.isDefault ? <StatusBadge tone="success">Default</StatusBadge> : null}
                  </div>
                  <p className="mt-2 text-sm text-omd-muted">{address.phone}</p>
                  <p className="mt-2 text-sm leading-6 text-omd-muted">{buildAddressText(address)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <form action={setDefaultCustomerAddressAction}>
                      <input type="hidden" name="id" value={address.id} />
                      <button className="rounded-md border border-omd-sand px-3 py-2 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                        Set default
                      </button>
                    </form>
                  ) : null}
                  <form action={deleteCustomerAddressAction}>
                    <input type="hidden" name="id" value={address.id} />
                    <button className="rounded-md border border-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              <details className="mt-4 rounded-md border border-omd-sand bg-omd-ivory/30 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-omd-brown">Edit this address</summary>
                <AddressFields id={address.id} address={address} submitLabel="Save address" />
              </details>
            </Panel>
          ))}
        </div>

        <Panel className="h-fit lg:sticky lg:top-6">
          <h2 className="text-xl font-semibold text-omd-brown">Add Address</h2>
          <p className="mt-2 text-sm text-omd-muted">Use this for checkout delivery selection. No courier integration is connected yet.</p>
          <AddressFields
            submitLabel="Add address"
            address={{
              fullName: user.name ?? "",
              phone: "",
              addressLine1: "",
              addressLine2: "",
              city: "",
              state: "",
              country: "India",
              pincode: "",
              landmark: "",
              isDefault: addresses.length === 0
            }}
          />
        </Panel>
      </section>
    </div>
  );
}

type AddressFieldsProps = {
  id?: string;
  submitLabel: string;
  address: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    country: string;
    pincode: string;
    landmark: string | null;
    isDefault: boolean;
  };
};

function AddressFields({ id, submitLabel, address }: AddressFieldsProps) {
  return (
    <form action={saveCustomerAddressAction} className="mt-4 grid gap-3">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="fullName" required defaultValue={address.fullName} placeholder="Full name" className="h-10 rounded-md border border-omd-sand px-3 text-sm" />
        <input name="phone" required defaultValue={address.phone} placeholder="Phone" className="h-10 rounded-md border border-omd-sand px-3 text-sm" />
        <input name="addressLine1" required defaultValue={address.addressLine1} placeholder="Address line 1" className="h-10 rounded-md border border-omd-sand px-3 text-sm sm:col-span-2" />
        <input name="addressLine2" defaultValue={address.addressLine2 ?? ""} placeholder="Address line 2" className="h-10 rounded-md border border-omd-sand px-3 text-sm sm:col-span-2" />
        <input name="city" required defaultValue={address.city} placeholder="City" className="h-10 rounded-md border border-omd-sand px-3 text-sm" />
        <input name="state" required defaultValue={address.state} placeholder="State" className="h-10 rounded-md border border-omd-sand px-3 text-sm" />
        <input name="pincode" required defaultValue={address.pincode} placeholder="Pincode" className="h-10 rounded-md border border-omd-sand px-3 text-sm" />
        <input name="country" required defaultValue={address.country || "India"} placeholder="Country" className="h-10 rounded-md border border-omd-sand px-3 text-sm" />
        <input name="landmark" defaultValue={address.landmark ?? ""} placeholder="Landmark optional" className="h-10 rounded-md border border-omd-sand px-3 text-sm sm:col-span-2" />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-omd-brown">
        <input name="isDefault" type="checkbox" defaultChecked={address.isDefault} />
        Use as default delivery address
      </label>
      <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
        {submitLabel}
      </button>
    </form>
  );
}
