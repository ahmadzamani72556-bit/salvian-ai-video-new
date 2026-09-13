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

function buildMurekaPrompt(request: RenderEngineRequest) {
  const project = request.project || {};
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  const sceneText = scenes.map((scene: any, index: number) => {
    const visual = typeof scene?.visual === "string" ? scene.visual : "";
    const voice = typeof scene?.voice === "string" ? scene.voice : "";
    const duration = Number(scene?.duration) || 0;
    return `Scene ${index + 1}${duration ? ` (${duration}s)` : ""}: ${visual}${voice ? ` Narration: ${voice}` : ""}`;
  }).filter(Boolean).join("\n");
  const script = typeof project.script === "string" ? project.script.trim() : "";
  const style = typeof project.style === "string" ? project.style : "Cinematic";
  const title = request.projectTitle || "SALVIAN AI VIDEO";
  const ratio = typeof project.ratio === "string" && project.ratio ? project.ratio : "16:9";
  return [
    `Create a complete cinematic video for the project titled "${title}".`,
    `Visual style: ${style}. Aspect ratio: ${ratio}.`,
    script ? `Narrative/script:\n${script}` : "",
    sceneText ? `Storyboard:\n${sceneText}` : "",
    "Use coherent characters, locations, lighting and camera movement across the video. Make the visuals follow the narrative and feel like a finished production."
  ].filter(Boolean).join("\n\n");
}

function buildMurekaPayload(request: RenderEngineRequest) {
  const project = request.project || {};
  const requestedDuration = Number(project.duration);
  const durationSeconds = Number.isFinite(requestedDuration) && requestedDuration > 0 ? Math.round(requestedDuration) : 5;
  const ratio = typeof project.ratio === "string" && project.ratio ? project.ratio : "16:9";
  const resolution = request.settings.resolution === "4K" ? "1080p" : request.settings.resolution || "720p";
  return {
    model: process.env.MUREKA_VIDEO_MODEL?.trim() || "doubao-seedance-2-5-260628",
    content: [{ type: "text", text: buildMurekaPrompt(request) }],
    duration: durationSeconds,
    execution_expires_after: 3600,
    generate_audio: true,
    priority: 0,
    ratio,
    resolution,
  };
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
  const taskId = String(task?.id || task?.task_id || task?.job_id || data.taskId || data.task_id || "");
  const outputUrl = findOutputUrl(task?.output || task?.result || task?.video || data.output || data.result || data.video);
  const status = normalizeStatus(task?.status || data.status || (outputUrl ? "succeeded" : "queued"));
  return {
    status,
    stage: status === "succeeded" ? "render-complete" : "creator-engine-queued",
    progress: status === "succeeded" ? 100 : Number(task?.progress ?? data.progress) || 0,
    engine: "connected",
    output: outputUrl ? { url: outputUrl, format: request.settings.format } : null,
    message: String(task?.message || data.message || (taskId ? `Long-form render ${taskId} diterima Creator.` : "Long-form render diterima Creator.")),
    ...(taskId ? { providerTaskId: taskId } : {}),
  };
}

export class HttpRenderEngine implements RenderEngineAdapter {
  async submit(request: RenderEngineRequest): Promise<RenderEngineResult> {
    const minutes = Number(request.project?.duration);
    if (!Number.isFinite(minutes) || ![5, 6, 7, 8].includes(minutes)) {
      return { status: "failed", stage: "invalid-duration", progress: 0, engine: "pending", output: null, message: "Produksi long-form hanya mendukung 5, 6, 7, atau 8 menit." };
    }

    // 5–8 minute production MUST use the proven Creator long-form engine.
    // Do not silently send minutes to a short-clip model: that can produce a
    // wrong duration or burn provider credits without creating the requested MP4.
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
