export function hasPublishableContent(content: Record<string, unknown>): boolean {
  return Object.keys(content).length > 0;
}

export function contentEquals(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}
