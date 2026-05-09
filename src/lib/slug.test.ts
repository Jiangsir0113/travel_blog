import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("creates lowercase URL slugs from English titles", () => {
    expect(slugify("Road Trip to Qingdao!")).toBe("road-trip-to-qingdao");
  });

  it("collapses repeated separators", () => {
    expect(slugify("  East---Lake & Sunset  ")).toBe("east-lake-sunset");
  });

  it("falls back when there is no ascii content", () => {
    expect(slugify("北京三日游")).toMatch(/^trip-\d+$/);
  });
});
