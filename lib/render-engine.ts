import { buildLongFormPlan, missingProviderConfiguration, providerEndpoint, type LongFormShot, type ProductionLog } from "./long-form-engine";

export type RenderEngineRequest = {
  jobId: string;
  projectId: string;
  projectTitle: string;
  project: any;
  settings: { projectId: string; projectTitle: string; resolution: string; fps: string; quality: string; format: string };
};

export type RenderEngineResult = {
  status: "queued" | "running" | "succeeded" | "failed" | "timeouted" | "cancelled";
  stage: string;
  progress: number;
  engine: "pending" | "connected";
  output: { url?: string; format?: string } | null;
  message: string;
  providerTaskId?: string;
  logs?: ProductionLog[];
};

export interface RenderEngineAdapter { submit(request: RenderEngineRequest): Promise<RenderEngineResult>; }

function providerApiKey(provider: string): string | undefined {
  if (provider === "seedance-2.5") return process.env.SEEDANCE_API_KEY;
  if (provider === "kling-3.0-omni") return process.env.KLING_API_KEY;
  return process.env.VEO_API_KEY;
}

function requestedResolution(value: string): string {
  if (value === "4K") return "1080p";
  if (value === "720p") return "720p";
  return "1080p";
}

function extractImageReferences(project: any): string[] {
  const candidates = [project?.referenceImages, project?.images, project?.photoAssets, project?.references];
  const urls: string[] = [];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      const url = typeof item === "string" ? item : item?.url;
      if (typeof url === "string" && /^https?:\/\//i.test(url)) urls.push(url);
    }
  }
  return [...new Set(urls)].slice(0, 30);
}

function buildSeedanceContent(shot: LongFormShot, project: any): any[] {
  const content: any[] = [{ type: "text", text: shot.prompt }];
  for (const url of extractImageReferences(project)) {
    content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
  }
  return content;
}

async function submitSeedance(request: RenderEngineRequest, shot: LongFormShot): Promise<RenderEngineResult> {
  const apiKey = providerApiKey("seedance-2.5");
  const baseUrl = providerEndpoint("seedance-2.5");
  if (!apiKey || !baseUrl) return { status:"failed", stage:"engine-not-configured", progress:20, engine:"pending", output:null, message:"Mesin video native belum memiliki kredensial produksi.", logs:[] };

  const duration = Math.max(4, Math.min(30, Math.round(shot.duration)));
  const payload = {
    model: process.env.SEEDANCE_MODEL || "doubao-seedance-2-5-260628",
    content: buildSeedanceContent(shot, request.project),
    generate_audio: true,
    ratio: request.project?.ratio || "16:9",
    duration,
    resolution: requestedResolution(request.settings.resolution),
    output_format: "mp4",
  };

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/contents/generations/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id) {
    const providerMessage = data?.error?.message || data?.message || `HTTP ${response.status}`;
    return { status:"failed", stage:"provider-submit-failed", progress:20, engine:"connected", output:null, message:"Mesin video tidak dapat menerima tugas produksi.", logs:[] };
  }

  return {
    status: "queued",
    stage: "provider-queued",
    progress: 22,
    engine: "connected",
    output: null,
    providerTaskId: String(data.id),
    message: `Salvian memulai produksi visual untuk ${duration} detik pertama.` ,
    logs: [],
  };
}

export class SalvianNativeRenderEngine implements RenderEngineAdapter {
  async submit(request: RenderEngineRequest): Promise<RenderEngineResult> {
    const minutes = Number(request.project?.duration);
    if (!Number.isFinite(minutes) || ![5, 6, 7, 8].includes(minutes)) return { status:"failed", stage:"invalid-duration", progress:0, engine:"pending", output:null, message:"Produksi long-form hanya mendukung 5, 6, 7, atau 8 menit." };
    let plan;
    try { plan = buildLongFormPlan(request.project); } catch (error) { return { status:"failed", stage:"planning-failed", progress:0, engine:"pending", output:null, message:error instanceof Error?error.message:"Gagal menyusun rencana long-form." }; }
    const missing = missingProviderConfiguration(plan);
    if (missing.length) return { status:"failed", stage:"engine-not-configured", progress:20, engine:"pending", output:null, message:"Mesin video native belum aktif sepenuhnya. Kredensial engine produksi belum dikonfigurasi di server.", logs:plan.logs };

    const firstShot = plan.shots[0];
    if (!firstShot) return { status:"failed", stage:"planning-failed", progress:0, engine:"pending", output:null, message:"Salvian tidak menemukan shot yang dapat diproduksi.", logs:plan.logs };

    try {
      const result = firstShot.provider === "seedance-2.5"
        ? await submitSeedance(request, firstShot)
        : { status:"failed" as const, stage:"provider-not-implemented", progress:20, engine:"pending" as const, output:null, message:"Adapter engine ini belum diaktifkan pada native worker." };
      return { ...result, logs: plan.logs };
    } catch (error) {
      return { status:"failed", stage:"provider-network-failed", progress:20, engine:"connected", output:null, message:error instanceof Error?error.message:"Koneksi mesin video gagal.", logs:plan.logs };
    }
  }
}

export const renderEngine: RenderEngineAdapter = new SalvianNativeRenderEngine();
