import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public readiness check for the native Salvian AI Video production engine.
 * No external video provider is contacted by this endpoint.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "SALVIAN AI VIDEO",
    engine: {
      provider: "salvian-native",
      status: "pending",
      adapter: "SalvianNativeRenderEngine",
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
    message: "Native Salvian AI Video engine slot is ready. No external Creator or third-party video provider is connected.",
  });
}
