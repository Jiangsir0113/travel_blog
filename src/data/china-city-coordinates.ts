export type MapLocation = {
  x: number;
  y: number;
};

export type ProvinceLocation = MapLocation & {
  highlightWidth: number;
  highlightHeight: number;
};

export const chinaMapCenter: MapLocation = {
  x: 46,
  y: 49,
};

export const provinceLocations: Record<string, ProvinceLocation> = {
  北京市: { x: 60, y: 35, highlightWidth: 4, highlightHeight: 4 },
  天津市: { x: 61, y: 38, highlightWidth: 4, highlightHeight: 4 },
  上海市: { x: 68, y: 51, highlightWidth: 4, highlightHeight: 4 },
  重庆市: { x: 47, y: 61, highlightWidth: 8, highlightHeight: 7 },
  河北省: { x: 58, y: 39, highlightWidth: 9, highlightHeight: 9 },
  山西省: { x: 53, y: 43, highlightWidth: 8, highlightHeight: 10 },
  辽宁省: { x: 68, y: 30, highlightWidth: 10, highlightHeight: 8 },
  吉林省: { x: 72, y: 24, highlightWidth: 9, highlightHeight: 8 },
  黑龙江省: { x: 71, y: 18, highlightWidth: 13, highlightHeight: 10 },
  江苏省: { x: 66, y: 49, highlightWidth: 7, highlightHeight: 7 },
  浙江省: { x: 66, y: 56, highlightWidth: 7, highlightHeight: 7 },
  安徽省: { x: 62, y: 52, highlightWidth: 8, highlightHeight: 9 },
  福建省: { x: 63, y: 65, highlightWidth: 8, highlightHeight: 9 },
  江西省: { x: 58, y: 62, highlightWidth: 8, highlightHeight: 9 },
  山东省: { x: 62, y: 44, highlightWidth: 10, highlightHeight: 8 },
  河南省: { x: 56, y: 50, highlightWidth: 10, highlightHeight: 9 },
  湖北省: { x: 55, y: 57, highlightWidth: 10, highlightHeight: 8 },
  湖南省: { x: 54, y: 65, highlightWidth: 9, highlightHeight: 10 },
  广东省: { x: 56, y: 75, highlightWidth: 11, highlightHeight: 9 },
  海南省: { x: 50, y: 86, highlightWidth: 5, highlightHeight: 4 },
  四川省: { x: 42, y: 59, highlightWidth: 14, highlightHeight: 12 },
  贵州省: { x: 48, y: 69, highlightWidth: 9, highlightHeight: 8 },
  云南省: { x: 39, y: 73, highlightWidth: 12, highlightHeight: 13 },
  陕西省: { x: 51, y: 51, highlightWidth: 9, highlightHeight: 11 },
  甘肃省: { x: 43, y: 45, highlightWidth: 18, highlightHeight: 10 },
  青海省: { x: 34, y: 49, highlightWidth: 16, highlightHeight: 11 },
  台湾省: { x: 68, y: 71, highlightWidth: 4, highlightHeight: 7 },
  内蒙古自治区: { x: 49, y: 30, highlightWidth: 28, highlightHeight: 13 },
  广西壮族自治区: { x: 50, y: 75, highlightWidth: 10, highlightHeight: 9 },
  西藏自治区: { x: 28, y: 65, highlightWidth: 21, highlightHeight: 15 },
  宁夏回族自治区: { x: 47, y: 45, highlightWidth: 5, highlightHeight: 6 },
  新疆维吾尔自治区: { x: 25, y: 33, highlightWidth: 23, highlightHeight: 19 },
  香港特别行政区: { x: 59, y: 78, highlightWidth: 3, highlightHeight: 3 },
  澳门特别行政区: { x: 57, y: 79, highlightWidth: 3, highlightHeight: 3 },
};

const cityLocations: Record<string, MapLocation> = {
  "上海市/上海市": { x: 68, y: 51 },
  "北京市/北京市": { x: 60, y: 35 },
  "天津市/天津市": { x: 61, y: 38 },
  "重庆市/重庆市": { x: 47, y: 61 },
  "陕西省/西安市": { x: 51, y: 52 },
  "陕西省/渭南市": { x: 52, y: 52 },
  "四川省/成都市": { x: 43, y: 60 },
  "湖北省/武汉市": { x: 56, y: 57 },
  "江苏省/南京市": { x: 64, y: 50 },
  "浙江省/杭州市": { x: 66, y: 55 },
  "福建省/厦门市": { x: 63, y: 68 },
  "广东省/广州市": { x: 56, y: 76 },
  "广东省/深圳市": { x: 58, y: 78 },
  "云南省/昆明市": { x: 42, y: 72 },
  "贵州省/贵阳市": { x: 49, y: 68 },
};

export function getProvinceLocation(province: string | null | undefined) {
  return province ? provinceLocations[province] ?? null : null;
}

export function getCityLocation(
  province: string | null | undefined,
  city: string,
) {
  if (province) {
    return cityLocations[`${province}/${city}`] ?? null;
  }

  return null;
}
