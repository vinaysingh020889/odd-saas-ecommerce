import { runtimeConfig } from "../lib/env";
import { getOrCreateChecklistForOwner, recomputeChecklistProgress, syncKundliChecklistFromAuthoritativeState } from "../lib/checklists";
import { prisma } from "../lib/prisma";

async function main() {
  if (runtimeConfig.appEnv !== "local") throw new Error("Kundli checklist reconciliation is restricted to local synthetic UAT.");
  const orders = await prisma.kundliOrder.findMany({ where: { user: { email: { endsWith: ".local" } } }, select: { id: true, tenantId: true, status: true } });
  let legacySkipped = 0;
  for (const order of orders) {
    await getOrCreateChecklistForOwner({ tenantId: order.tenantId, relatedType: "KUNDLI_ORDER", relatedId: order.id });
    await syncKundliChecklistFromAuthoritativeState(order.tenantId, order.id);
    if (!["DELIVERED", "COMPLETED"].includes(order.status)) continue;
    await prisma.$transaction(async (tx) => {
      const instance = await tx.checklistInstance.findFirst({ where: { tenantId: order.tenantId, relatedType: "KUNDLI_ORDER", relatedId: order.id }, select: { id: true } });
      if (!instance) return;
      const legacy = await tx.checklistInstanceItem.findMany({ where: { checklistInstanceId: instance.id, title: { in: ["Review birth details", "Check partner details if matching"] }, status: { in: ["pending", "in_progress"] } }, select: { id: true } });
      if (!legacy.length) return;
      const reason = "Legacy synthetic record completed before the RC3 human-verification gate.";
      await tx.checklistInstanceItem.updateMany({ where: { id: { in: legacy.map((item) => item.id) } }, data: { status: "skipped", skippedReason: reason, blockedReason: null } });
      await tx.checklistActivity.createMany({ data: legacy.map((item) => ({ tenantId: order.tenantId, checklistInstanceId: instance.id, itemId: item.id, action: "legacy_synthetic_verification_skipped", note: reason })) });
      await recomputeChecklistProgress(instance.id, tx);
      await tx.auditLog.create({ data: { tenantId: order.tenantId, action: "kundli_checklist_legacy_synthetic_reconciled", entity: "KundliOrder", entityId: order.id, metadata: { skippedItems: legacy.length, reason } } });
      legacySkipped += legacy.length;
    });
  }
  console.log(JSON.stringify({ reconciledOrders: orders.length, legacySkipped }));
}

main().finally(() => prisma.$disconnect());
