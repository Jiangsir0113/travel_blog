export type MapTripStatus = "draft" | "published";

export type MapTripAuthor = {
  id: string;
  display_name: string | null;
  map_color: string | null;
};

export type MapTripInput = {
  id: string;
  slug: string;
  title: string;
  province?: string | null;
  city: string;
  destination_name: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  status: MapTripStatus | string;
  published_at: string | null;
  visited_at: string;
  profiles?: MapTripAuthor | MapTripAuthor[] | null;
};

export type FootprintTripLink = {
  id: string;
  slug: string;
  title: string;
  destinationName: string;
  visitedAt: string;
  author: {
    id: string;
    name: string;
    mapColor: string;
  };
};

export type CityFootprint = {
  province: string;
  city: string;
  trips: FootprintTripLink[];
  authorColors: string[];
};

export type ProvinceFootprint = {
  province: string;
  cityCount: number;
  tripCount: number;
  authorColors: string[];
  cities: CityFootprint[];
};

const fallbackAuthor = {
  id: "unknown",
  name: "旅行伙伴",
  mapColor: "#2f6f7b",
};

const unknownProvince = "未知省份";
const unknownCity = "未知城市";
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

export function aggregatePublishedTripsByCity(trips: MapTripInput[]): CityFootprint[] {
  const cityMap = new Map<string, CityFootprint>();

  trips
    .filter((trip) => trip.status === "published")
    .forEach((trip) => {
      const province = normalizeAreaName(trip.province) || unknownProvince;
      const city = normalizeAreaName(trip.city) || unknownCity;
      const author = normalizeAuthor(trip.profiles);
      const cityKey = `${province}::${city}`;
      const existing =
        cityMap.get(cityKey) ??
        ({
          province,
          city,
          trips: [],
          authorColors: [],
        } satisfies CityFootprint);

      existing.trips.push({
        id: trip.id,
        slug: trip.slug,
        title: trip.title,
        destinationName: trip.destination_name,
        visitedAt: trip.visited_at,
        author,
      });

      if (!existing.authorColors.includes(author.mapColor)) {
        existing.authorColors.push(author.mapColor);
      }

      cityMap.set(cityKey, existing);
    });

  return Array.from(cityMap.values()).sort(
    (a, b) => a.province.localeCompare(b.province, "zh-CN") || a.city.localeCompare(b.city, "zh-CN"),
  );
}

export function summarizeFootprintsByProvince(footprints: CityFootprint[]): ProvinceFootprint[] {
  const provinceMap = new Map<string, ProvinceFootprint>();

  footprints.forEach((footprint) => {
    const existing =
      provinceMap.get(footprint.province) ??
      ({
        province: footprint.province,
        cityCount: 0,
        tripCount: 0,
        authorColors: [],
        cities: [],
      } satisfies ProvinceFootprint);

    existing.cityCount += 1;
    existing.tripCount += footprint.trips.length;
    existing.cities.push(footprint);

    footprint.authorColors.forEach((color) => {
      if (!existing.authorColors.includes(color)) {
        existing.authorColors.push(color);
      }
    });

    provinceMap.set(footprint.province, existing);
  });

  return Array.from(provinceMap.values()).sort(
    (a, b) => b.tripCount - a.tripCount || a.province.localeCompare(b.province, "zh-CN"),
  );
}

export function getFootprintTotals(provinces: ProvinceFootprint[]) {
  return provinces.reduce(
    (totals, province) => ({
      provinceCount: totals.provinceCount + 1,
      cityCount: totals.cityCount + province.cityCount,
      tripCount: totals.tripCount + province.tripCount,
    }),
    { provinceCount: 0, cityCount: 0, tripCount: 0 },
  );
}

export function normalizeAreaName(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, "") ?? "";
}

function normalizeAuthor(author: MapTripInput["profiles"]): FootprintTripLink["author"] {
  const firstAuthor = Array.isArray(author) ? author[0] : author;

  return {
    id: firstAuthor?.id ?? fallbackAuthor.id,
    name: firstAuthor?.display_name || fallbackAuthor.name,
    mapColor: normalizeMapColor(firstAuthor?.map_color),
  };
}

function normalizeMapColor(mapColor: string | null | undefined) {
  return mapColor && hexColorPattern.test(mapColor) ? mapColor : fallbackAuthor.mapColor;
}
