import { describe, expect, it } from "vitest";

import { chinaMapCenter } from "../data/china-city-coordinates";
import { aggregatePublishedTripsByCity, type MapTripInput } from "./map-data";

const baseTrip: MapTripInput = {
  id: "trip-1",
  slug: "trip-one",
  title: "第一篇游记",
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

  it("aggregates multiple published trips in the same city", () => {
    const footprints = aggregatePublishedTripsByCity([
      baseTrip,
      { ...baseTrip, id: "trip-2", slug: "trip-two", title: "第二篇游记" },
    ]);

    expect(footprints).toHaveLength(1);
    expect(footprints[0].trips.map((trip) => trip.slug)).toEqual(["trip-one", "trip-two"]);
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

  it("places unknown cities at the map center", () => {
    const footprints = aggregatePublishedTripsByCity([
      { ...baseTrip, city: "未知城市" },
    ]);

    expect(footprints[0]).toMatchObject({
      city: "未知城市",
      x: chinaMapCenter.x,
      y: chinaMapCenter.y,
      isFallbackLocation: true,
    });
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
