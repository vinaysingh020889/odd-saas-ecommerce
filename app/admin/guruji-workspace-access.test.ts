import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("ASTROLOGER admin route isolation", () => {
  it("keeps Kundli queue and practitioner controls behind operations roles", () => {
    expect(source("./kundli/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"])');
    expect(source("./kundli/practitioners/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"])');
  });

  it("server-gates assignments, customer lists, documents, payments, and reports", () => {
    expect(source("./assignments/page.tsx")).toContain("requireOperationsAdminUser()");
    expect(source("./customers/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"])');
    expect(source("./customers/[id]/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"])');
    expect(source("./documents/page.tsx")).toContain("requireOperationsAdminUser()");
    expect(source("./payments/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"])');
    expect(source("./reports/page.tsx")).toContain("requireOperationsAdminUser()");
    expect(source("./search/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"])');
  });

  it("shows only My Work and personal Notifications to a restricted ASTROLOGER", () => {
    const layout = source("./layout.tsx");
    expect(layout).toContain('["/admin/my-work", "/admin/notifications"].includes(item.href)');
    expect(layout).toContain("restrictedAstrologer");
  });
});
