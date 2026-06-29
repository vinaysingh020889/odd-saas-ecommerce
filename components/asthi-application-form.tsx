"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAsthiApplicationAction } from "@/lib/asthi-actions";

type AsthiLocation = {
  id: string;
  name: string;
  city: string;
  state: string;
  description: string | null;
};

type AsthiPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  inclusions: string[];
};

type AsthiAddOn = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

function formatAmount(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="w-full rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron disabled:opacity-70">
      {pending ? "Preparing review..." : "Review Booking"}
    </button>
  );
}

export function AsthiApplicationForm({
  locations,
  packages,
  addOns,
  defaultName,
  defaultEmail
}: {
  locations: AsthiLocation[];
  packages: AsthiPackage[];
  addOns: AsthiAddOn[];
  defaultName?: string | null;
  defaultEmail?: string | null;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const selectedPackage = useMemo(() => packages.find((item) => item.id === packageId) ?? packages[0], [packages, packageId]);
  const selectedAddOnRows = useMemo(() => addOns.filter((item) => selectedAddOns.includes(item.id)), [addOns, selectedAddOns]);
  const total = (selectedPackage?.price ?? 0) + selectedAddOnRows.reduce((sum, item) => sum + item.price, 0);

  return (
    <form action={createAsthiApplicationAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Step 1</p>
          <h2 className="mt-1 text-xl font-semibold text-omd-brown">Select holy place</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {locations.map((location) => (
              <label key={location.id} className={`cursor-pointer rounded-lg border p-4 ${locationId === location.id ? "border-omd-gold bg-omd-ivory" : "border-omd-sand bg-white"}`}>
                <input type="radio" name="locationId" value={location.id} checked={locationId === location.id} onChange={() => setLocationId(location.id)} className="sr-only" />
                <span className="block font-semibold text-omd-brown">{location.name}</span>
                <span className="mt-1 block text-sm text-omd-muted">{location.city}, {location.state}</span>
                {location.description ? <span className="mt-2 block text-xs leading-5 text-omd-muted">{location.description}</span> : null}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Step 2</p>
          <h2 className="mt-1 text-xl font-semibold text-omd-brown">Choose package and add-ons</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {packages.map((item) => (
              <label key={item.id} className={`cursor-pointer rounded-lg border p-4 ${packageId === item.id ? "border-omd-gold bg-omd-ivory" : "border-omd-sand bg-white"}`}>
                <input type="radio" name="packageId" value={item.id} checked={packageId === item.id} onChange={() => setPackageId(item.id)} className="sr-only" />
                <span className="block font-semibold text-omd-brown">{item.name}</span>
                <span className="mt-2 block text-sm font-semibold text-omd-saffron">{formatAmount(item.price, item.currency)}</span>
                {item.description ? <span className="mt-2 block text-xs leading-5 text-omd-muted">{item.description}</span> : null}
              </label>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {addOns.map((addOn) => (
              <label key={addOn.id} className="flex cursor-pointer gap-3 rounded-lg border border-omd-sand bg-white p-3 text-sm">
                <input
                  name="addOnIds"
                  type="checkbox"
                  value={addOn.id}
                  checked={selectedAddOns.includes(addOn.id)}
                  onChange={(event) => {
                    setSelectedAddOns((current) =>
                      event.target.checked ? [...current, addOn.id] : current.filter((id) => id !== addOn.id)
                    );
                  }}
                />
                <span>
                  <span className="block font-semibold text-omd-brown">{addOn.name} - {formatAmount(addOn.price)}</span>
                  {addOn.description ? <span className="mt-1 block text-xs text-omd-muted">{addOn.description}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Step 3</p>
          <h2 className="mt-1 text-xl font-semibold text-omd-brown">Applicant details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-omd-brown">Service mode
              <select name="serviceMode" className="h-10 rounded-md border border-omd-sand px-3">
                <option value="REMOTE_ASSISTED">Remote assisted</option>
                <option value="FAMILY_PRESENT">Family present</option>
                <option value="INTERNATIONAL">International / NRI</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-omd-brown">Preferred date optional<input name="preferredDate" type="date" className="h-10 rounded-md border border-omd-sand px-3" /></label>
            <label className="grid gap-2 text-sm font-medium text-omd-brown">Applicant name<input name="applicantName" defaultValue={defaultName ?? ""} required className="h-10 rounded-md border border-omd-sand px-3" /></label>
            <label className="grid gap-2 text-sm font-medium text-omd-brown">Phone<input name="applicantPhone" required className="h-10 rounded-md border border-omd-sand px-3" /></label>
            <label className="grid gap-2 text-sm font-medium text-omd-brown">Email<input name="applicantEmail" type="email" defaultValue={defaultEmail ?? ""} required className="h-10 rounded-md border border-omd-sand px-3" /></label>
            <label className="grid gap-2 text-sm font-medium text-omd-brown">Country<input name="country" placeholder="India" className="h-10 rounded-md border border-omd-sand px-3" /></label>
            <label className="grid gap-2 text-sm font-medium text-omd-brown md:col-span-2">City<input name="city" className="h-10 rounded-md border border-omd-sand px-3" /></label>
          </div>
          <label className="mt-5 flex gap-3 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm leading-6 text-omd-muted">
            <input name="termsAccepted" type="checkbox" required className="mt-1" />
            <span>I understand this is a guided service request. Final coordination happens after mock payment and document verification.</span>
          </label>
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-omd-sand bg-white p-5 shadow-sm lg:sticky lg:top-20">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Review</p>
        <h2 className="mt-2 text-xl font-semibold text-omd-brown">Booking summary</h2>
        <div className="mt-5 grid gap-3 text-sm text-omd-muted">
          <div className="flex justify-between gap-4">
            <span>{selectedPackage?.name ?? "Package"}</span>
            <strong className="text-omd-brown">{formatAmount(selectedPackage?.price ?? 0, selectedPackage?.currency)}</strong>
          </div>
          {selectedAddOnRows.map((addOn) => (
            <div key={addOn.id} className="flex justify-between gap-4">
              <span>{addOn.name}</span>
              <strong className="text-omd-brown">{formatAmount(addOn.price)}</strong>
            </div>
          ))}
          <div className="border-t border-omd-sand pt-3">
            <div className="flex justify-between gap-4 text-base font-semibold text-omd-brown">
              <span>Total</span>
              <span>{formatAmount(total, selectedPackage?.currency)}</span>
            </div>
          </div>
        </div>
        <p className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm leading-6 text-omd-muted">
          Full family, deceased, and document details are collected only after mock payment confirmation.
        </p>
        <div className="mt-5">
          <SubmitButton />
        </div>
      </aside>
    </form>
  );
}
