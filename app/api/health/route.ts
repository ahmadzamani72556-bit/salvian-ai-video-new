import { NextResponse } from "next/server";

export async function GET() {
  const provider = process.env.MUREKA_RENDER_PROVIDER || "mureka";
  const engineConfigured = Boolean(process.env.MUREKA_API_KEY);

  return NextResponse.json({
    ok: true,
    app: "SALVIAN AI VIDEO",
    version: "engine-ready",
    production: {
      generation: "ready-for-provider",
      rendering: engineConfigured ? "provider-configured" : "waiting-for-engine-key",
      provider,
      credits: "central-creator",
    },
    message: engineConfigured
      ? "Aplikasi siap menerima engine produksi."
      : "Aplikasi dan kontrak produksi siap; engine produksi belum dikonfigurasi.",
    timestamp: new Date().toISOString(),
  });
}
