import { describe, expect, it } from "vitest";

import { canWriteTrips, isAdmin } from "./roles";

describe("role helpers", () => {
  it("detects admins", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("author")).toBe(false);
    expect(isAdmin("reader")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("allows admins and authors to write trips", () => {
    expect(canWriteTrips("admin")).toBe(true);
    expect(canWriteTrips("author")).toBe(true);
    expect(canWriteTrips("reader")).toBe(false);
    expect(canWriteTrips(null)).toBe(false);
  });
});
