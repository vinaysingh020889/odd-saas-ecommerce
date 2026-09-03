import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Kundli detail operational history", () => {
  it("renders assignment history and promise-change information without legacy assignedTo input", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).toContain("Assignment and Promise History");
    expect(source).toContain("deliveryPromiseChangedReason");
    expect(source).not.toContain('name="assignedTo"');
    expect(source).not.toContain("AdminAssignmentPanel");
  });
});
