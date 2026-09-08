"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { createWalletAdjustment } from "@/lib/wallet";

export async function createWalletAdjustmentAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const userId = String(formData.get("userId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "credit");
  const rawAmount = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId || !Number.isFinite(rawAmount) || rawAmount <= 0) throw new Error("Choose a customer and enter a positive amount.");
  const customer = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
  if (!customer) throw new Error("Customer was not found for this tenant.");
  const amount = direction === "debit" ? -rawAmount : rawAmount;
  const transaction = await prisma.$transaction(async (tx) => {
    const created = await createWalletAdjustment({
      tenantId, userId, amount, reason, actorId: admin.id,
      idempotencyKey: "admin-wallet:" + admin.id + ":" + randomUUID()
    }, tx);
    await tx.auditLog.create({ data: {
      tenantId, actorId: admin.id, action: amount > 0 ? "wallet_adjustment_credit" : "wallet_adjustment_debit",
      entity: "WalletTransaction", entityId: created.id,
      metadata: { userId, amount, reason, idempotencyKey: created.idempotencyKey }
    } });
    return created;
  });
  revalidatePath("/admin/wallet");
  revalidatePath("/wallet");
  redirect("/admin/wallet?adjusted=" + transaction.id);
}
