import { describe, expect, it, vi } from "vitest";
import { calculateCartInclusiveTax, resolveShippingSnapshot } from "@/lib/checkout-maturity";

describe("checkout maturity", () => {
  it("allocates a cart discount before calculating inclusive tax", () => {
    const result = calculateCartInclusiveTax(
      [
        { id: "physical", itemType: "PHYSICAL", lineTotal: 100 },
        { id: "service", itemType: "SERVICE", lineTotal: 100 }
      ],
      20
    );

    expect(result.lines.map((line) => line.discountedLineTotal)).toEqual([90, 90]);
    expect(result.lines.map((line) => line.taxAmount)).toEqual([4.29, 13.73]);
    expect(result.taxableAmount).toBe(161.98);
    expect(result.taxAmount).toBe(18.02);
  });

  it("uses a configured product GST rate instead of the item-type fallback", () => {
    const result = calculateCartInclusiveTax(
      [{ id: "configured", itemType: "PHYSICAL", lineTotal: 112, taxPercent: 12 }],
      0
    );

    expect(result.lines[0]).toMatchObject({
      taxPercent: 12,
      taxableAmount: 100,
      taxAmount: 12,
      discountedLineTotal: 112
    });
  });

  it("keeps rounding allocation equal to the final discounted cart value", () => {
    const result = calculateCartInclusiveTax(
      [
        { id: "one", itemType: "PHYSICAL", lineTotal: 10 },
        { id: "two", itemType: "PHYSICAL", lineTotal: 10 },
        { id: "three", itemType: "PHYSICAL", lineTotal: 10 }
      ],
      10
    );

    expect(result.lines.reduce((total, line) => total + line.discountedLineTotal, 0)).toBe(20);
  });

  it("blocks a pincode that has no configured delivery zone", async () => {
    const client = {
      serviceablePincode: { findUnique: vi.fn().mockResolvedValue(null) }
    };

    const result = await resolveShippingSnapshot("tenant", "400 053", client as never);

    expect(client.serviceablePincode.findUnique).toHaveBeenCalledWith({
      where: { tenantId_pincode: { tenantId: "tenant", pincode: "400053" } }
    });
    expect(result).toMatchObject({
      shippingAmount: 0,
      shippingServiceable: false,
      shippingNote: "Delivery is not configured for this pincode yet."
    });
  });
});
