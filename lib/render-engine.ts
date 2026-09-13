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

export interface RenderEngineAdapter {
  submit(request: RenderEngineRequest): Promise<RenderEngineResult>;
}

function authHeaders(apiKey?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function buildMurekaPrompt(request: RenderEngineRequest) {
  const project = request.project || {};
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  const sceneText = scenes
    .map((scene: any, index: number) => {
      const visual = typeof scene?.visual === "string" ? scene.visual : "";
      const voice = typeof scene?.voice === "string" ? scene.voice : "";
      const duration = Number(scene?.duration) || 0;
      return `Scene ${index + 1}${duration ? ` (${duration}s)` : ""}: ${visual}${voice ? ` Narration: ${voice}` : ""}`;
    })
    .filter(Boolean)
    .join("\n");

  const script = typeof project.script === "string" ? project.script.trim() : "";
  const style = typeof project.style === "string" ? project.style : "Cinematic";
  const title = request.projectTitle || "SALVIAN AI VIDEO";
  const ratio = project.ratio || request.settings.resolution === "4K" ? "16:9" : project.ratio || "16:9";

  return [
    `Create a complete cinematic video for the project titled "${title}".`,
    `Visual style: ${style}. Aspect ratio: ${ratio}.`,
    script ? `Narrative/script:\n${script}` : "",
    sceneText ? `Storyboard:\n${sceneText}` : "",
    "Use coherent characters, locations, lighting and camera movement across the video. Make the visuals follow the narrative and feel like a finished production.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildMurekaPayload(request: RenderEngineRequest) {
  const project = request.project || {};
  const requestedDuration = Number(project.duration);
  const duration = Number.isFinite(requestedDuration) && requestedDuration > 0 ? Math.round(requestedDuration) : 5;
  const ratio = typeof project.ratio === "string" && project.ratio ? project.ratio : "16:9";
  const resolution = request.settings.resolution === "4K" ? "1080p" : request.settings.resolution || "720p";
  const prompt = buildMurekaPrompt(request);
  const model = process.env.MUREKA_VIDEO_MODEL?.trim() || "doubao-seedance-2-5-260628";

  return {
    model,
    content: [{ type: "text", text: prompt }],
    duration,
    execution_expires_after: 3600,
    generate_audio: true,
    priority: 0,
    ratio,
    resolution,
  };
}

/**
 * Mureka video adapter.
 *
 * Mureka's official video generation endpoint is POST /v1/video/generate.
 * The provider receives Mureka's native request shape rather than the
 * internal RenderEngineRequest wrapper used by the Salvian UI.
 */
export class HttpRenderEngine implements RenderEngineAdapter {
  async submit(request: RenderEngineRequest): Promise<RenderEngineResult> {
    const genericUrl = process.env.RENDER_ENGINE_URL?.trim();
    const provider = (process.env.MUREKA_RENDER_PROVIDER || "mureka").trim().toLowerCase();
    const murekaUrl = process.env.MUREKA_VIDEO_GENERATE_URL?.trim() || "https://api.mureka.ai/v1/video/generate";

    const url = genericUrl || (provider === "mureka" ? murekaUrl : undefined);
    const apiKey = genericUrl ? process.env.RENDER_ENGINE_API_KEY?.trim() : process.env.MUREKA_API_KEY?.trim();

    if (!url || !apiKey) {
      return {
        status: "failed",
        stage: "waiting-for-engine",
        progress: 0,
        engine: "pending",
        output: null,
        message: "Render engine belum terhubung. Isi MUREKA_API_KEY di environment server (dan gunakan MUREKA_VIDEO_GENERATE_URL hanya jika endpoint ingin dioverride).",
      };
    }

    try {
      const payload = genericUrl ? request : buildMurekaPayload(request);
      const response = await fetch(url, {
        method: "POST",
        headers: authHeaders(apiKey),
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let data: Record<string, any> = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      if (!response.ok) {
        const providerMessage = data?.error?.message || data?.message || data?.detail || "Provider render menolak permintaan.";
        return {
          status: "failed",
          stage: "provider-error",
          progress: 0,
          engine: "connected",
          output: null,
          message: String(providerMessage),
        };
      }

      const task = data.task || data.data?.task || data.data || data;
      const taskId = String(task?.id || task?.task_id || task?.job_id || "");
      const outputUrl = task?.output?.url || task?.result?.video_url || task?.result?.url || task?.video_url || task?.url || data.video_url || data.url || "";
      const rawStatus = String(task?.status || data.status || "queued").toLowerCase();
      const normalizedStatus: RenderEngineResult["status"] =
        rawStatus === "succeeded" || rawStatus === "success" || rawStatus === "completed" || rawStatus === "successed"
          ? "succeeded"
          : rawStatus === "running" || rawStatus === "processing" || rawStatus === "in_progress"
            ? "running"
            : rawStatus === "failed" || rawStatus === "error"
              ? "failed"
              : rawStatus === "timeouted" || rawStatus === "timeout"
                ? "timeouted"
                : rawStatus === "cancelled" || rawStatus === "canceled"
                  ? "cancelled"
                  : "queued";

      return {
        status: normalizedStatus,
        stage: normalizedStatus === "succeeded" ? "render-complete" : "provider-queued",
        progress: normalizedStatus === "succeeded" ? 100 : Number.isFinite(Number(task?.progress)) ? Number(task.progress) : 0,
        engine: "connected",
        output: outputUrl ? { url: String(outputUrl), format: request.settings.format } : null,
        message: String(task?.message || data.message || (taskId ? `Render job ${taskId} diterima Mureka.` : "Render job diterima Mureka.")),
        ...(taskId ? { providerTaskId: taskId } : {}),
      };
    } catch (error) {
      return {
        status: "failed",
        stage: "provider-network-error",
        progress: 0,
        engine: "connected",
        output: null,
        message: error instanceof Error ? error.message : "Provider render tidak dapat dihubungi.",
      };
    }
  }
}

export const renderEngine: RenderEngineAdapter = new HttpRenderEngine();
