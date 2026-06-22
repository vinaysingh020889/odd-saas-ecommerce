"use server";

import { createStockAdjustmentAction as createStockAdjustment, releaseReservedStockForOrderAction as releaseReservedStock } from "@/lib/inventory";

export async function createStockAdjustmentAction(formData: FormData) {
  return createStockAdjustment(formData);
}

export async function releaseReservedStockForOrderAction(formData: FormData) {
  return releaseReservedStock(formData);
}
