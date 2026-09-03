"use server";

import { createStockAdjustmentAction as createStockAdjustment, releaseReservedStockForOrderAction as releaseReservedStock, setAvailableStockAction as setAvailableStock } from "@/lib/inventory";

export async function createStockAdjustmentAction(formData: FormData) {
  return createStockAdjustment(formData);
}

export async function setAvailableStockAction(formData: FormData) {
  return setAvailableStock(formData);
}

export async function releaseReservedStockForOrderAction(formData: FormData) {
  return releaseReservedStock(formData);
}
