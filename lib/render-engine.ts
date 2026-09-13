export type RenderEngineRequest = {
  jobId: string;
  projectId: string;
  projectTitle: string;
  project: unknown;
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

/**
 * HTTP renderer adapter.
 *
 * The render API is deliberately configured through environment variables so
 * provider endpoint changes never leak credentials into the browser or force
 * a UI rewrite. The provider receives the complete project/timeline contract.
 *
 * Required for a live renderer:
 *   RENDER_ENGINE_URL + RENDER_ENGINE_API_KEY
 * or:
 *   MUREKA_VIDEO_GENERATE_URL + MUREKA_API_KEY
 *
 * If no provider is configured we fail explicitly instead of pretending that
 * a video was rendered. This prevents the old "queued forever" behaviour.
 */
export class HttpRenderEngine implements RenderEngineAdapter {
  async submit(request: RenderEngineRequest): Promise<RenderEngineResult> {
    const genericUrl = process.env.RENDER_ENGINE_URL?.trim();
    const murekaUrl = process.env.MUREKA_VIDEO_GENERATE_URL?.trim();
    const provider = (process.env.MUREKA_RENDER_PROVIDER || "").trim().toLowerCase();

    const url = genericUrl || (provider === "mureka" ? murekaUrl : undefined);
    const apiKey = genericUrl ? process.env.RENDER_ENGINE_API_KEY : process.env.MUREKA_API_KEY;

    if (!url) {
      return {
        status: "failed",
        stage: "waiting-for-engine",
        progress: 0,
        engine: "pending",
        output: null,
        message: "Render engine belum terhubung. Konfigurasikan MUREKA_VIDEO_GENERATE_URL + MUREKA_API_KEY atau RENDER_ENGINE_URL + RENDER_ENGINE_API_KEY di environment server.",
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: authHeaders(apiKey),
        body: JSON.stringify(request),
      });

      const raw = await response.text();
      let data: Record<string, any> = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      if (!response.ok) {
        const providerMessage = data?.error?.message || data?.message || "Provider render menolak permintaan.";
        return {
          status: "failed",
          stage: "provider-error",
          progress: 0,
          engine: "connected",
          output: null,
          message: String(providerMessage),
        };
      }

      const taskId = String(data.id || data.task_id || data.job_id || "");
      const outputUrl = data.output?.url || data.video_url || data.url || data.output_url;
      const status = String(data.status || "queued").toLowerCase();
      const normalizedStatus: RenderEngineResult["status"] =
        status === "succeeded" || status === "success" || status === "completed"
          ? "succeeded"
          : status === "running"
            ? "running"
            : status === "failed"
              ? "failed"
              : status === "timeouted"
                ? "timeouted"
                : status === "cancelled"
                  ? "cancelled"
                  : "queued";

      return {
        status: normalizedStatus,
        stage: String(data.stage || (normalizedStatus === "succeeded" ? "render-complete" : "provider-queued")),
        progress: Number.isFinite(Number(data.progress)) ? Number(data.progress) : normalizedStatus === "succeeded" ? 100 : 0,
        engine: "connected",
        output: outputUrl ? { url: String(outputUrl), format: request.settings.format } : null,
        message: String(data.message || (taskId ? `Render job ${taskId} diterima provider.` : "Render job diterima provider.")),
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
