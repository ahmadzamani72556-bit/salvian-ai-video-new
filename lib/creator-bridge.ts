// Salvian AI Video New is standalone.
// Creator account, billing, credit consumption, refunds, and external account popups
// are intentionally retired. These compatibility exports remain so older Studio code
// cannot break, but they perform no network calls and never redirect to Creator.

export const CREATOR_ORIGIN = "";
export const CREATOR_ACCOUNT_URL = "";
export const CREATOR_CREDIT_BRIDGE_URL = "";

export type CreatorProfile = { display_name: string; email: string; plan: string; credits: number };
export function isCreatorProfile(_value: unknown): _value is CreatorProfile { return false; }

export function openCreatorAccountAndReturn(_nextPath = "/create") { return false; }
export function openCreatorAccount() { return null; }

export function consumeCreatorCredits(_amount: number, _description: string) {
  return Promise.resolve({ success: true, balance: 0, message: "Billing nonaktif — Salvian AI Video New berjalan mandiri." });
}

export function refundCreatorCredits(_amount: number, _description: string) {
  return Promise.resolve({ success: true, balance: 0, message: "Billing nonaktif — tidak ada kredit yang perlu dikembalikan." });
}
