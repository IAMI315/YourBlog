export function hasPublishableContent(content: Record<string, unknown>): boolean {
  return Object.keys(content).length > 0;
}

export function contentEquals(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function hasImagesMissingAltText(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasImagesMissingAltText);
  }

  if (!isRecord(value)) return false;

  if (value.type === "image") {
    const attrs = isRecord(value.attrs) ? value.attrs : {};
    return typeof attrs.alt !== "string" || attrs.alt.trim().length === 0;
  }

  return Object.values(value).some(hasImagesMissingAltText);
}
