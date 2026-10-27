import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function configured(name:string){return Boolean(process.env[name]?.trim());}

export async function GET() {
  const remoteUrl=configured("VIDEO_ENGINE_INTERNAL_URL");
  const remoteToken=configured("VIDEO_ENGINE_INTERNAL_TOKEN");
  const seedance=configured("SEEDANCE_API_KEY");
  const kling=configured("KLING_API_KEY");
  const veo=Boolean(process.env.VEO_ACCESS_TOKEN||process.env.GOOGLE_CLOUD_ACCESS_TOKEN||process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const director=configured("OPENAI_API_KEY");
  const storage=configured("DATABASE_URL");
  const connected=Boolean(seedance||kling||veo||(remoteUrl&&remoteToken));
  const providers={seedance:seedance?"ready":"not-configured",kling:kling?"ready":"not-configured",veo:veo?"ready":"not-configured"};
  return NextResponse.json({
    ok:true,
    app:"SALVIAN AI VIDEO",
    engine:{provider:"salvian-native",status:connected?"ready":"pending",adapter:"SalvianNativeRenderEngine",connected,apiKeyConfigured:connected,providers,remoteEngine:remoteUrl?remoteToken?"ready":"misconfigured":"disabled"},
    director:{status:director?"ready":"not-configured",provider:"OpenAI Responses API"},
    storage:{status:storage?"ready":"not-configured"},
    contract:{submit:"/api/render",prepare:"/api/render/prepare",supportedFormats:["MP4","WebM"],supportedResolutions:["720p","1080p","4K"],supportedFps:["24 FPS","30 FPS","60 FPS"],supportedQualities:["Standard","High","Maximum"]},
    message:connected&&director&&storage?"Native Salvian AI Video production prerequisites are ready. Credentials remain server-side.":"Native production prerequisites are incomplete; no fake readiness is reported."
  });
}
