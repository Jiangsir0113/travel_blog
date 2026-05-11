import { describe, expect, it } from "vitest";

import {
  aggregatePublishedTripsByCity,
  getFootprintTotals,
  normalizeAreaName,
  summarizeFootprintsByProvince,
  type MapTripInput,
} from "./map-data";

const baseTrip: MapTripInput = {
  id: "trip-1",
  slug: "trip-one",
  title: "第一篇游记",
  province: "上海市",
  city: "上海市",
  destination_name: "上海",
  status: "published",
  published_at: "2026-05-01T00:00:00.000Z",
  visited_at: "2026-04-20",
  profiles: {
    id: "author-1",
    display_name: "阿青",
    map_color: "#c85f45",
  },
};

describe("aggregatePublishedTripsByCity", () => {
  it("excludes draft trips", () => {
    const footprints = aggregatePublishedTripsByCity([
      baseTrip,
      { ...baseTrip, id: "draft-1", status: "draft", city: "北京市" },
    ]);

    expect(footprints).toHaveLength(1);
    expect(footprints[0].city).toBe("上海市");
  });

  it("aggregates multiple published trips in the same province and city", () => {
    const footprints = aggregatePublishedTripsByCity([
      baseTrip,
      { ...baseTrip, id: "trip-2", slug: "trip-two", title: "第二篇游记" },
    ]);

    expect(footprints).toHaveLength(1);
    expect(footprints[0]).toMatchObject({
      province: "上海市",
      city: "上海市",
    });
    expect(footprints[0].trips.map((trip) => trip.slug)).toEqual(["trip-one", "trip-two"]);
  });

  it("keeps same-name cities separate when provinces differ", () => {
    const footprints = aggregatePublishedTripsByCity([
      { ...baseTrip, province: "吉林省", city: "吉林市" },
      { ...baseTrip, id: "trip-2", province: "吉林市", city: "吉林市" },
    ]);

    expect(footprints).toHaveLength(2);
  });

  it("normalizes blank province and city names", () => {
    const footprints = aggregatePublishedTripsByCity([
      { ...baseTrip, province: "   ", city: "  " },
    ]);

    expect(footprints[0]).toMatchObject({
      province: "未知省份",
      city: "未知城市",
    });
  });

  it("keeps colors from different authors in one city", () => {
    const footprints = aggregatePublishedTripsByCity([
      baseTrip,
      {
        ...baseTrip,
        id: "trip-2",
        profiles: {
          id: "author-2",
          display_name: "小满",
          map_color: "#2f6f7b",
        },
      },
    ]);

    expect(footprints[0].authorColors).toEqual(["#c85f45", "#2f6f7b"]);
    expect(footprints[0].trips.map((trip) => trip.author.mapColor)).toEqual([
      "#c85f45",
      "#2f6f7b",
    ]);
  });

  it("falls back when author color is malformed", () => {
    const footprints = aggregatePublishedTripsByCity([
      {
        ...baseTrip,
        profiles: {
          id: "author-unsafe",
          display_name: "异常颜色",
          map_color: "red; background: url(test)",
        },
      },
    ]);

    expect(footprints[0].authorColors).toEqual(["#2f6f7b"]);
    expect(footprints[0].trips[0].author.mapColor).toBe("#2f6f7b");
  });
});

describe("summarizeFootprintsByProvince", () => {
  it("creates province summaries with city and trip totals", () => {
    const footprints = aggregatePublishedTripsByCity([
      baseTrip,
      { ...baseTrip, id: "trip-2", province: "陕西省", city: "西安市" },
      { ...baseTrip, id: "trip-3", province: "陕西省", city: "渭南市" },
      { ...baseTrip, id: "trip-4", province: "陕西省", city: "渭南市" },
    ]);
    const summaries = summarizeFootprintsByProvince(footprints);

    expect(summaries[0]).toMatchObject({
      province: "陕西省",
      cityCount: 2,
      tripCount: 3,
    });
    expect(getFootprintTotals(summaries)).toEqual({
      provinceCount: 2,
      cityCount: 3,
      tripCount: 4,
    });
  });
});

describe("normalizeAreaName", () => {
  it("trims and removes internal whitespace", () => {
    expect(normalizeAreaName(" 陕 西 省 ")).toBe("陕西省");
  });
});
