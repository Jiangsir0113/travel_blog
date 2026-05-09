import { describe, expect, it } from "vitest";

import {
  generateUniqueTripSlug,
  getTripFormDraft,
  parseTripFormData,
  TripFormError,
} from "./trips";

function makeFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    title: "  西湖周末  ",
    summary: "  一次短途散步  ",
    content: "  正文内容  ",
    visited_at: "2026-05-01",
    destination_name: "  西湖  ",
    province: "  浙江  ",
    city: "  杭州  ",
    latitude: "30.25",
    longitude: "120.16",
    status: "draft",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

describe("parseTripFormData", () => {
  it("trims and normalizes trip form payload", () => {
    expect(parseTripFormData(makeFormData())).toEqual({
      title: "西湖周末",
      summary: "一次短途散步",
      content: "正文内容",
      visited_at: "2026-05-01",
      destination_name: "西湖",
      province: "浙江",
      city: "杭州",
      latitude: 30.25,
      longitude: 120.16,
      status: "draft",
    });
  });

  it("normalizes optional blank fields to null", () => {
    const payload = parseTripFormData(
      makeFormData({ summary: " ", latitude: " ", longitude: " " }),
    );

    expect(payload.summary).toBeNull();
    expect(payload.latitude).toBeNull();
    expect(payload.longitude).toBeNull();
  });

  it("reports Chinese validation messages", () => {
    expect(() =>
      parseTripFormData(
        makeFormData({
          title: "",
          latitude: "north",
          longitude: "",
          status: "archived",
        }),
      ),
    ).toThrow(TripFormError);
  });

  it("keeps raw form draft values for redisplay", () => {
    const draft = getTripFormDraft(
      makeFormData({
        title: "  未修剪标题  ",
        visited_at: "not-a-date",
        latitude: "north",
        status: "archived",
      }),
    );

    expect(draft.title).toBe("  未修剪标题  ");
    expect(draft.visited_at).toBe("not-a-date");
    expect(draft.latitude).toBe("north");
    expect(draft.status).toBe("archived");
  });

  it("rejects values longer than database limits", () => {
    expect(() =>
      parseTripFormData(
        makeFormData({
          title: "a".repeat(121),
          summary: "b".repeat(241),
          destination_name: "c".repeat(121),
          province: "d".repeat(41),
          city: "e".repeat(41),
        }),
      ),
    ).toThrow(TripFormError);
  });
});

describe("generateUniqueTripSlug", () => {
  function makeSupabaseWithSlugs(slugs: string[]) {
    return {
      from() {
        return {
          select() {
            return {
              async or() {
                return {
                  data: slugs.map((slug) => ({ slug })),
                  error: null,
                };
              },
            };
          },
        };
      },
    };
  }

  it("returns the base slug when it is unused", async () => {
    await expect(
      generateUniqueTripSlug(makeSupabaseWithSlugs([]) as never, "West Lake"),
    ).resolves.toBe("west-lake");
  });

  it("appends the next numeric suffix when slugs conflict", async () => {
    await expect(
      generateUniqueTripSlug(
        makeSupabaseWithSlugs(["west-lake", "west-lake-2", "west-lake-4"]) as never,
        "West Lake",
      ),
    ).resolves.toBe("west-lake-3");
  });
});
