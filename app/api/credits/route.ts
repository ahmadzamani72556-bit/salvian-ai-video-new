import { NextResponse } from 'next/server';

const CREATOR_ACCOUNT_URL = 'https://salvian-ai-creator.vercel.app/akun.html?from=video';
const CREATOR_PAYMENT_URL = 'https://salvian-ai-creator.vercel.app/modules/payment/products.html';

/**
 * Credit ownership is intentionally centralized in SALVIAN AI CREATOR.
 * Video never keeps a second wallet or fake local balance.
 */
export async function GET() {
  return NextResponse.json({
    source: 'SALVIAN AI CREATOR',
    managedExternally: true,
    plan: null,
    credits: null,
    monthlyCredits: null,
    premium: null,
    accountUrl: CREATOR_ACCOUNT_URL,
    paymentUrl: CREATOR_PAYMENT_URL
  });
}

/**
 * Spending is blocked here until the authenticated Creator-backed credit
 * transaction endpoint is connected. This prevents the old hard-coded
 * 100-credit wallet from ever pretending to be the real balance.
 */
export async function POST() {
  return NextResponse.json({
    ok: false,
    code: 'CENTRAL_CREDITS_REQUIRED',
    message: 'Kredit SALVIAN AI VIDEO dikelola terpusat melalui SALVIAN AI CREATOR.',
    accountUrl: CREATOR_ACCOUNT_URL,
    paymentUrl: CREATOR_PAYMENT_URL
  }, { status: 409 });
}
