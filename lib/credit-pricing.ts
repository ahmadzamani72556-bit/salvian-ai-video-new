/**
 * FINAL internal pricing for one SALVIAN AI VIDEO long-form production.
 *
 * One production = one Creator credit transaction.
 * The price is intentionally conservative so the platform keeps a provider-
 * cost reserve for long-form generation, retries and infrastructure.
 * Provider billing remains external and must be reviewed before changing these values.
 */
export const VIDEO_CREDIT_PRICING = Object.freeze({
  5: 1200,
  6: 1440,
  7: 1680,
  8: 1920,
} as const);

export type VideoDuration = keyof typeof VIDEO_CREDIT_PRICING;

export function getVideoCreditCost(duration: number): number {
  const minutes = Number(duration) as VideoDuration;
  if (!(minutes in VIDEO_CREDIT_PRICING)) {
    throw new Error("Durasi video hanya 5, 6, 7, atau 8 menit.");
  }
  return VIDEO_CREDIT_PRICING[minutes];
}

/**
 * Resolve a canonical cost from a production description. This is used as a
 * safety net so an older client cannot accidentally send the retired 225/250/
 * 275/300-credit values to Creator.
 */
export function getVideoCreditCostFromDescription(description: string, fallbackAmount: number): number {
  const match = String(description || "").match(/Produksi\s+(5|6|7|8)\s+menit/i);
  if (match) return getVideoCreditCost(Number(match[1]));
  return Math.floor(Number(fallbackAmount));
}
