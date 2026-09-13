export type MurekaVideoTaskResult = {
  id: string;
  model?: string;
  status: "queued" | "running" | "succeeded" | "failed" | "timeouted" | "cancelled";
  progress: number;
  outputUrl?: string;
  message: string;
  raw: Record<string, any>;
};

function authHeaders(apiKey?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function normalizeStatus(value: unknown): MurekaVideoTaskResult["status"] {
  const status = String(value || "queued").toLowerCase();
  if (["succeeded", "success", "completed", "successed"].includes(status)) return "succeeded";
  if (["running", "processing", "in_progress", "generating"].includes(status)) return "running";
  if (["failed", "error"].includes(status)) return "failed";
  if (["expired", "timeout", "timeouted"].includes(status)) return "timeouted";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  return "queued";
}

function findVideoUrl(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : undefined;
  if (Array.isArray(value)) { for (const item of value) { const found = findVideoUrl(item); if (found) return found; } return undefined; }
  if (typeof value === "object") {
    for (const key of ["video_url", "videoUrl", "url", "output_url", "outputUrl", "download_url", "downloadUrl", "video"]) {
      if (key in value) { const found = findVideoUrl(value[key]); if (found) return found; }
    }
    for (const item of Object.values(value)) { const found = findVideoUrl(item); if (found) return found; }
  }
  return undefined;
}

/**
 * The long-form render is owned by SALVIAN AI CREATOR. Video NEW only polls
 * the task here; it never falls back to a short-clip provider for a 5–8 minute
 * request.
 */
export async function queryMurekaVideoTask(taskId: string): Promise<MurekaVideoTaskResult> {
  const apiKey = process.env.SALVIAN_LONG_VIDEO_RENDER_KEY?.trim();
  const template = process.env.SALVIAN_LONG_VIDEO_STATUS_URL_TEMPLATE?.trim()
    || "https://salvian-ai-creator.vercel.app/api/video?taskId={task_id}";
  if (!taskId) throw new Error("Render task_id wajib diisi.");

  const url = template.replace("{task_id}", encodeURIComponent(taskId));
  const response = await fetch(url, { method: "GET", headers: authHeaders(apiKey), cache: "no-store" });
  const raw = await response.text();
  let data: Record<string, any> = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }

  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.error || data?.message || `Render status gagal (${response.status}).`;
    throw new Error(String(providerMessage));
  }

  const task = data.task || data.data?.task || data.data || data;
  const id = String(task?.id || task?.task_id || taskId);
  const status = normalizeStatus(task?.status || data.status);
  const outputUrl = findVideoUrl(task?.content) || findVideoUrl(task?.output) || findVideoUrl(task?.result) || findVideoUrl(task?.video) || findVideoUrl(task) || findVideoUrl(data.output) || findVideoUrl(data.result);
  const progress = status === "succeeded" ? 100 : Number.isFinite(Number(task?.progress ?? data.progress)) ? Number(task?.progress ?? data.progress) : status === "running" ? 50 : 5;
  const errorMessage = task?.error?.message || task?.error?.detail || data?.error?.message || data?.error;

  return {
    id,
    model: task?.model,
    status,
    progress,
    outputUrl,
    message: String(errorMessage || task?.message || data.message || (status === "succeeded" ? "Video long-form selesai dibuat." : `Status render: ${status}.`)),
    raw: data,
  };
}
