export type CityCoordinate = {
  x: number;
  y: number;
};

export const chinaMapCenter = {
  x: 56,
  y: 56,
};

export const cityCoordinates: Record<string, CityCoordinate> = {
  上海市: { x: 77, y: 59 },
  北京市: { x: 69, y: 34 },
  广州市: { x: 63, y: 78 },
  深圳市: { x: 64, y: 81 },
  杭州市: { x: 73, y: 61 },
  成都市: { x: 43, y: 61 },
  西安市: { x: 52, y: 50 },
  武汉市: { x: 61, y: 60 },
  南京市: { x: 72, y: 55 },
  厦门市: { x: 70, y: 75 },
};
