export type RenderEngineRequest = {
  jobId: string;
  projectId: string;
  projectTitle: string;
  project: any;
  settings: {
    projectId: string;
    projectTitle: string;
    resolution: string;
    fps: string;
    quality: string;
    format: string;
  };
};

export type RenderEngineResult = {
  status: "queued" | "running" | "succeeded" | "failed" | "timeouted" | "cancelled";
  stage: string;
  progress: number;
  engine: "pending" | "connected";
  output: { url?: string; format?: string } | null;
  message: string;
  providerTaskId?: string;
};

export interface RenderEngineAdapter { submit(request: RenderEngineRequest): Promise<RenderEngineResult>; }

function authHeaders(apiKey?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function normalizeStatus(value: unknown): RenderEngineResult["status"] {
  const status = String(value || "queued").toLowerCase();
  if (["succeeded", "success", "completed", "successed"].includes(status)) return "succeeded";
  if (["running", "processing", "in_progress", "generating"].includes(status)) return "running";
  if (["failed", "error"].includes(status)) return "failed";
  if (["timeout", "timeouted", "expired"].includes(status)) return "timeouted";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  return "queued";
}

function findOutputUrl(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : undefined;
  if (Array.isArray(value)) { for (const item of value) { const found = findOutputUrl(item); if (found) return found; } return undefined; }
  if (typeof value === "object") {
    for (const key of ["output_url", "outputUrl", "video_url", "videoUrl", "url", "download_url", "downloadUrl", "video"]) {
      if (key in value) { const found = findOutputUrl(value[key]); if (found) return found; }
    }
    for (const item of Object.values(value)) { const found = findOutputUrl(item); if (found) return found; }
  }
  return undefined;
}

async function submitCreatorLongForm(request: RenderEngineRequest, url: string, apiKey?: string): Promise<RenderEngineResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      type: "long-form-video",
      jobId: request.jobId,
      projectId: request.projectId,
      projectTitle: request.projectTitle,
      durationMinutes: Number(request.project?.duration),
      project: request.project,
      settings: request.settings,
    }),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || "Creator long-form engine menolak permintaan.";
    return { status: "failed", stage: "creator-engine-error", progress: 0, engine: "connected", output: null, message: String(message) };
  }

  const task = data.task || data.data?.task || data.data || data;
  const taskId = String(task?.id || task?.task_id || task?.job_id || data.taskId || data.task_id || "").trim();
  const outputUrl = findOutputUrl(task?.output || task?.result || task?.video || data.output || data.result || data.video);
  const status = normalizeStatus(task?.status || data.status || (outputUrl ? "succeeded" : "queued"));

  // Never report a successful queue when the provider did not return a real task id.
  // This prevents the Studio from polling a fabricated/empty task and gives us a
  // deterministic failure instead of a misleading "render queued" state.
  if (!taskId) {
    return {
      status: "failed",
      stage: "creator-engine-contract-error",
      progress: 0,
      engine: "connected",
      output: null,
      message: "Creator long-form engine tidak mengembalikan task ID yang valid.",
    };
  }

  // A terminal success is only valid when an actual video URL is present.
  if (status === "succeeded" && !outputUrl) {
    return {
      status: "failed",
      stage: "creator-engine-output-error",
      progress: 0,
      engine: "connected",
      output: null,
      message: `Render ${taskId} dilaporkan selesai, tetapi URL MP4 belum dikembalikan oleh engine.`,
      providerTaskId: taskId,
    };
  }

  return {
    status,
    stage: status === "succeeded" ? "render-complete" : "creator-engine-queued",
    progress: status === "succeeded" ? 100 : Math.min(99, Math.max(0, Number(task?.progress ?? data.progress) || 0)),
    engine: "connected",
    output: outputUrl ? { url: outputUrl, format: request.settings.format } : null,
    message: String(task?.message || data.message || `Long-form render ${taskId} diterima Creator.`),
    providerTaskId: taskId,
  };
}

export class HttpRenderEngine implements RenderEngineAdapter {
  async submit(request: RenderEngineRequest): Promise<RenderEngineResult> {
    const minutes = Number(request.project?.duration);
    if (!Number.isFinite(minutes) || ![5, 6, 7, 8].includes(minutes)) {
      return { status: "failed", stage: "invalid-duration", progress: 0, engine: "pending", output: null, message: "Produksi long-form hanya mendukung 5, 6, 7, atau 8 menit." };
    }

    // Long-form production is intentionally isolated from Mureka short-clip generation.
    // Video NEW sends one complete 5–8 minute production request to the proven
    // SALVIAN long-form engine and then polls its task until the final MP4 exists.
    const creatorUrl = process.env.SALVIAN_LONG_VIDEO_RENDER_URL?.trim() || "https://salvian-ai-creator.vercel.app/api/video";
    const creatorKey = process.env.SALVIAN_LONG_VIDEO_RENDER_KEY?.trim();
    try {
      return await submitCreatorLongForm(request, creatorUrl, creatorKey);
    } catch (error) {
      return { status: "failed", stage: "creator-engine-network-error", progress: 0, engine: "connected", output: null, message: error instanceof Error ? error.message : "Creator long-form engine tidak dapat dihubungi." };
    }
  }
}

export const renderEngine: RenderEngineAdapter = new HttpRenderEngine();
