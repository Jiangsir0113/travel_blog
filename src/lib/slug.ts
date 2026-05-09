function fallbackSlug() {
  return `trip-${Date.now()}`;
}

export function slugify(value: string) {
  if (!/[A-Za-z0-9]/.test(value)) {
    return fallbackSlug();
  }

  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || fallbackSlug();
}
