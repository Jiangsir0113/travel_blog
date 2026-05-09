import { chinaMapCenter, cityCoordinates } from "../data/china-city-coordinates";

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
  city: string;
  destination_name: string;
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
  city: string;
  x: number;
  y: number;
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
      const coordinate = cityCoordinates[trip.city];
      const author = normalizeAuthor(trip.profiles);
      const existing =
        cityMap.get(trip.city) ??
        createCityFootprint({
          city: trip.city,
          x: coordinate?.x ?? chinaMapCenter.x,
          y: coordinate?.y ?? chinaMapCenter.y,
          isFallbackLocation: !coordinate,
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

      cityMap.set(trip.city, existing);
    });

  return Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city, "zh-CN"));
}

function createCityFootprint({
  city,
  x,
  y,
  isFallbackLocation,
}: Omit<CityFootprint, "trips" | "authorColors">): CityFootprint {
  return {
    city,
    x,
    y,
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
