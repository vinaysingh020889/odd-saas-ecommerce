"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { normalizePincode } from "@/lib/checkout-maturity";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function safeReturnTo(formData: FormData) {
  const value = text(formData, "returnTo");
  return value.startsWith("/") ? value : "/addresses";
}

function revalidateAddressSurfaces() {
  revalidatePath("/addresses");
  revalidatePath("/checkout");
  revalidatePath("/dashboard");
}

export async function saveCustomerAddressAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const fullName = text(formData, "fullName") || user.name || "Customer";
  const phone = text(formData, "phone");
  const addressLine1 = text(formData, "addressLine1");
  const addressLine2 = nullableText(formData, "addressLine2");
  const city = text(formData, "city");
  const state = text(formData, "state");
  const country = text(formData, "country") || "India";
  const pincode = normalizePincode(text(formData, "pincode"));
  const landmark = nullableText(formData, "landmark");
  const requestedDefault = formData.get("isDefault") === "on";

  if (!fullName || !phone || !addressLine1 || !city || !state || !pincode) {
    throw new Error("Full name, phone, address line, city, state and pincode are required.");
  }

  await prisma.$transaction(async (tx) => {
    const existingCount = await tx.customerAddress.count({ where: { tenantId, userId: user.id } });
    const makeDefault = requestedDefault || existingCount === 0;

    if (makeDefault) {
      await tx.customerAddress.updateMany({ where: { tenantId, userId: user.id }, data: { isDefault: false } });
    }

    const data = {
      tenantId,
      userId: user.id,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      pincode,
      landmark,
      isDefault: makeDefault
    };

    if (id) {
      const address = await tx.customerAddress.findFirstOrThrow({ where: { id, tenantId, userId: user.id }, select: { id: true } });
      await tx.customerAddress.update({ where: { id: address.id }, data });
    } else {
      await tx.customerAddress.create({ data });
    }
  });

  revalidateAddressSurfaces();
  redirect(safeReturnTo(formData));
}

export async function setDefaultCustomerAddressAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");

  await prisma.$transaction(async (tx) => {
    const address = await tx.customerAddress.findFirstOrThrow({ where: { id, tenantId, userId: user.id }, select: { id: true } });
    await tx.customerAddress.updateMany({ where: { tenantId, userId: user.id }, data: { isDefault: false } });
    await tx.customerAddress.update({ where: { id: address.id }, data: { isDefault: true } });
  });

  revalidateAddressSurfaces();
  redirect(safeReturnTo(formData));
}

export async function deleteCustomerAddressAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");

  await prisma.$transaction(async (tx) => {
    const address = await tx.customerAddress.findFirstOrThrow({ where: { id, tenantId, userId: user.id }, select: { id: true, isDefault: true } });
    await tx.customerAddress.delete({ where: { id: address.id } });

    if (address.isDefault) {
      const nextAddress = await tx.customerAddress.findFirst({
        where: { tenantId, userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true }
      });

      if (nextAddress) {
        await tx.customerAddress.update({ where: { id: nextAddress.id }, data: { isDefault: true } });
      }
    }
  });

  revalidateAddressSurfaces();
  redirect(safeReturnTo(formData));
}
