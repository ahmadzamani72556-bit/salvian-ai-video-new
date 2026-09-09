import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public, non-secret readiness check for the production engine slot.
 * The real provider is intentionally not called here.
 */
export async function GET() {
  const provider = process.env.MUREKA_RENDER_PROVIDER || "mureka";

  return NextResponse.json({
    ok: true,
    app: "SALVIAN AI VIDEO",
    engine: {
      provider,
      status: "pending",
      adapter: "PendingRenderEngine",
      connected: false,
      apiKeyConfigured: false,
    },
    contract: {
      submit: "/api/render",
      prepare: "/api/render/prepare",
      supportedFormats: ["MP4", "WebM"],
      supportedResolutions: ["720p", "1080p", "4K"],
      supportedFps: ["24 FPS", "30 FPS", "60 FPS"],
      supportedQualities: ["Standard", "High", "Maximum"],
    },
    message: "Studio dan kontrak render siap. Sambungkan adapter engine produksi saat provider engine siap.",
  });
}
