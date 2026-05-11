import {
  chinaMapCenter,
  getCityLocation,
  getProvinceLocation,
} from "../data/china-city-coordinates";

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
  province: string | null;
  city: string;
  x: number;
  y: number;
  provinceX: number;
  provinceY: number;
  provinceHighlightWidth: number;
  provinceHighlightHeight: number;
  isFallbackLocation: boolean;
  trips: FootprintTripLink[];
  authorColors: string[];
};

const fallbackAuthor = {
  id: "unknown",
  name: "旅行伙伴",
  mapColor: "#2f6f7b",
};

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
export function aggregatePublishedTripsByCity(trips: MapTripInput[]): CityFootprint[] {
  const cityMap = new Map<string, CityFootprint>();

  trips
    .filter((trip) => trip.status === "published")
    .forEach((trip) => {
      const provinceLocation = getProvinceLocation(trip.province);
      const cityLocation = getCityLocation(trip.province, trip.city);
      const coordinate = cityLocation ?? provinceLocation;
      const author = normalizeAuthor(trip.profiles);
      const cityKey = `${trip.province ?? "未知省份"}::${trip.city}`;
      const existing =
        cityMap.get(cityKey) ??
        createCityFootprint({
          province: trip.province ?? null,
          city: trip.city,
          x: coordinate?.x ?? chinaMapCenter.x,
          y: coordinate?.y ?? chinaMapCenter.y,
          provinceX: provinceLocation?.x ?? chinaMapCenter.x,
          provinceY: provinceLocation?.y ?? chinaMapCenter.y,
          provinceHighlightWidth: provinceLocation?.highlightWidth ?? 8,
          provinceHighlightHeight: provinceLocation?.highlightHeight ?? 6,
          isFallbackLocation: !cityLocation,
        });

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

  return Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city, "zh-CN"));
}

function createCityFootprint({
  province,
  city,
  x,
  y,
  provinceX,
  provinceY,
  provinceHighlightWidth,
  provinceHighlightHeight,
  isFallbackLocation,
}: Omit<CityFootprint, "trips" | "authorColors">): CityFootprint {
  return {
    province,
    city,
    x,
    y,
    provinceX,
    provinceY,
    provinceHighlightWidth,
    provinceHighlightHeight,
    isFallbackLocation,
    trips: [],
    authorColors: [],
  };
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
