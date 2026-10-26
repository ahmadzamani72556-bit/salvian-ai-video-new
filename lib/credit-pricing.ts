// Billing and credit pricing are retired in Salvian AI Video New.
// Kept only as a compatibility layer for older Studio imports.
export const VIDEO_CREDIT_PRICING = Object.freeze({
  5: 0,
  6: 0,
  7: 0,
  8: 0,
} as const);

export type VideoDuration = keyof typeof VIDEO_CREDIT_PRICING;

export function getVideoCreditCost(duration: number): number {
  const minutes = Number(duration) as VideoDuration;
  if (!(minutes in VIDEO_CREDIT_PRICING)) {
    throw new Error("Durasi video hanya 5, 6, 7, atau 8 menit.");
  }
  return 0;
}

export function getVideoCreditCostFromDescription(_description: string, _fallbackAmount: number): number {
  return 0;
}
