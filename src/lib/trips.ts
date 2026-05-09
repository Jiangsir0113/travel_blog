import type { SupabaseClient } from "@supabase/supabase-js";

import { slugify } from "./slug";

export type TripStatus = "draft" | "published";

export type TripFormPayload = {
  title: string;
  summary: string | null;
  content: string;
  visited_at: string;
  destination_name: string;
  province: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  status: TripStatus;
};

export type TripFormDraft = {
  title: string;
  summary: string;
  content: string;
  visited_at: string;
  destination_name: string;
  province: string;
  city: string;
  latitude: string;
  longitude: string;
  status: string;
};

export class TripFormError extends Error {
  constructor(public readonly messages: string[]) {
    super(messages.join("\n"));
    this.name = "TripFormError";
  }
}

function readRawText(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value;
}

function readText(formData: FormData, name: string) {
  return readRawText(formData, name).trim();
}

function parseOptionalNumber(value: string, label: string) {
  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new TripFormError([`${label}必须是有效数字。`]);
  }

  return numberValue;
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

export function getTripFormDraft(formData: FormData): TripFormDraft {
  return {
    title: readRawText(formData, "title"),
    summary: readRawText(formData, "summary"),
    content: readRawText(formData, "content"),
    visited_at: readRawText(formData, "visited_at"),
    destination_name: readRawText(formData, "destination_name"),
    province: readRawText(formData, "province"),
    city: readRawText(formData, "city"),
    latitude: readRawText(formData, "latitude"),
    longitude: readRawText(formData, "longitude"),
    status: readRawText(formData, "status"),
  };
}

export function parseTripFormData(formData: FormData): TripFormPayload {
  const title = readText(formData, "title");
  const summary = readText(formData, "summary");
  const content = readText(formData, "content");
  const visited_at = readText(formData, "visited_at");
  const destination_name = readText(formData, "destination_name");
  const province = readText(formData, "province");
  const city = readText(formData, "city");
  const latitudeValue = readText(formData, "latitude");
  const longitudeValue = readText(formData, "longitude");
  const status = readText(formData, "status");
  const errors: string[] = [];

  if (!title) {
    errors.push("请填写游记标题。");
  } else if (title.length > 120) {
    errors.push("游记标题不能超过 120 个字符。");
  }

  if (!content) {
    errors.push("请填写游记正文。");
  }

  if (!visited_at) {
    errors.push("请选择旅行日期。");
  } else if (!isValidDateInput(visited_at)) {
    errors.push("旅行日期格式不正确。");
  }

  if (!destination_name) {
    errors.push("请填写目的地。");
  } else if (destination_name.length > 120) {
    errors.push("目的地不能超过 120 个字符。");
  }

  if (!province) {
    errors.push("请填写省份。");
  } else if (province.length > 40) {
    errors.push("省份不能超过 40 个字符。");
  }

  if (!city) {
    errors.push("请填写城市。");
  } else if (city.length > 40) {
    errors.push("城市不能超过 40 个字符。");
  }

  if (summary.length > 240) {
    errors.push("摘要不能超过 240 个字符。");
  }

  if (status !== "draft" && status !== "published") {
    errors.push("状态只能是草稿或已发布。");
  }

  let latitude: number | null = null;
  let longitude: number | null = null;

  try {
    latitude = parseOptionalNumber(latitudeValue, "纬度");
    longitude = parseOptionalNumber(longitudeValue, "经度");
  } catch (error) {
    if (error instanceof TripFormError) {
      errors.push(...error.messages);
    } else {
      throw error;
    }
  }

  if ((latitude === null) !== (longitude === null)) {
    errors.push("经纬度请同时填写，或都留空。");
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    errors.push("纬度必须在 -90 到 90 之间。");
  }

  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    errors.push("经度必须在 -180 到 180 之间。");
  }

  if (errors.length > 0) {
    throw new TripFormError(errors);
  }

  return {
    title,
    summary: summary || null,
    content,
    visited_at,
    destination_name,
    province,
    city,
    latitude,
    longitude,
    status: status as TripStatus,
  };
}

export async function generateUniqueTripSlug(
  supabase: SupabaseClient,
  title: string,
) {
  const baseSlug = slugify(title);
  const { data, error } = await supabase
    .from("trips")
    .select("slug")
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);

  if (error) {
    throw error;
  }

  const existingSlugs = new Set(
    (data ?? [])
      .map((trip) => (typeof trip.slug === "string" ? trip.slug : null))
      .filter((slug): slug is string => Boolean(slug)),
  );

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;

    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

export function isTripSlugUniqueError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "23505" ||
    error.message?.toLowerCase().includes("trips_slug_key") ||
    error.message?.toLowerCase().includes("duplicate key")
  );
}
