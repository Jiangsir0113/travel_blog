export type CityCoordinate = {
  x: number;
  y: number;
};

type GeoCoordinate = {
  latitude: number;
  longitude: number;
};

export const chinaMapCenter = {
  x: 46,
  y: 49,
};

const chinaGeoBounds = {
  minLongitude: 73.5,
  maxLongitude: 135.1,
  minLatitude: 18,
  maxLatitude: 53.6,
};

const chinaMapImageBounds = {
  left: 14.5,
  right: 77.1,
  top: 14,
  bottom: 84,
};

const cityGeoCoordinates: Record<string, GeoCoordinate> = {
  上海市: { latitude: 31.2304, longitude: 121.4737 },
  北京市: { latitude: 39.9042, longitude: 116.4074 },
  广州市: { latitude: 23.1291, longitude: 113.2644 },
  深圳市: { latitude: 22.5431, longitude: 114.0579 },
  杭州市: { latitude: 30.2741, longitude: 120.1551 },
  成都市: { latitude: 30.5728, longitude: 104.0668 },
  西安市: { latitude: 34.3416, longitude: 108.9398 },
  渭南市: { latitude: 34.4994, longitude: 109.5102 },
  武汉市: { latitude: 30.5928, longitude: 114.3055 },
  南京市: { latitude: 32.0603, longitude: 118.7969 },
  厦门市: { latitude: 24.4798, longitude: 118.0894 },
};

export const cityCoordinates = Object.entries(cityGeoCoordinates).reduce<
  Record<string, CityCoordinate>
>((coordinates, [city, coordinate]) => {
  const point = projectChinaGeoPoint(coordinate);

  if (point) {
    coordinates[city] = point;
  }

  return coordinates;
}, {});

export function projectChinaGeoPoint({
  latitude,
  longitude,
}: GeoCoordinate): CityCoordinate | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < chinaGeoBounds.minLatitude ||
    latitude > chinaGeoBounds.maxLatitude ||
    longitude < chinaGeoBounds.minLongitude ||
    longitude > chinaGeoBounds.maxLongitude
  ) {
    return null;
  }

  return {
    x:
      chinaMapImageBounds.left +
      ((longitude - chinaGeoBounds.minLongitude) /
        (chinaGeoBounds.maxLongitude - chinaGeoBounds.minLongitude)) *
        (chinaMapImageBounds.right - chinaMapImageBounds.left),
    y:
      chinaMapImageBounds.top +
      ((chinaGeoBounds.maxLatitude - latitude) /
        (chinaGeoBounds.maxLatitude - chinaGeoBounds.minLatitude)) *
        (chinaMapImageBounds.bottom - chinaMapImageBounds.top),
  };
}
