export type MurekaVideoTaskResult = {
  id: string;
  model?: string;
  status: "queued" | "running" | "succeeded" | "failed" | "timeouted" | "cancelled";
  progress: number;
  outputUrl?: string;
  message: string;
  raw: Record<string, any>;
};

function authHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function normalizeStatus(value: unknown): MurekaVideoTaskResult["status"] {
  const status = String(value || "queued").toLowerCase();
  if (["succeeded", "success", "completed", "successed"].includes(status)) return "succeeded";
  if (["running", "processing", "in_progress"].includes(status)) return "running";
  if (["failed", "error"].includes(status)) return "failed";
  if (["expired", "timeout", "timeouted"].includes(status)) return "timeouted";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  return "queued";
}

function findVideoUrl(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) && (/\.mp4(?:$|[?#])/i.test(value) || /video|cdn/i.test(value)) ? value : undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVideoUrl(item);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === "object") {
    const priorityKeys = ["video_url", "videoUrl", "url", "output_url", "outputUrl", "video"];
    for (const key of priorityKeys) {
      if (key in value) {
        const found = findVideoUrl(value[key]);
        if (found) return found;
      }
    }
    for (const item of Object.values(value)) {
      const found = findVideoUrl(item);
      if (found) return found;
    }
  }
  return undefined;
}

export async function queryMurekaVideoTask(taskId: string): Promise<MurekaVideoTaskResult> {
  const apiKey = process.env.MUREKA_API_KEY?.trim();
  const template = process.env.MUREKA_VIDEO_QUERY_URL_TEMPLATE?.trim() || "https://api.mureka.ai/v1/video/query/{task_id}";
  if (!apiKey) throw new Error("MUREKA_API_KEY belum dikonfigurasi di server.");
  if (!taskId) throw new Error("Mureka task_id wajib diisi.");

  const url = template.replace("{task_id}", encodeURIComponent(taskId));
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(apiKey),
    cache: "no-store",
  });
  const raw = await response.text();
  let data: Record<string, any> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.message || data?.detail || `Mureka query gagal (${response.status}).`;
    throw new Error(String(providerMessage));
  }

  const task = data.task || data.data?.task || data.data || data;
  const id = String(task?.id || task?.task_id || taskId);
  const status = normalizeStatus(task?.status || data.status);
  const outputUrl = findVideoUrl(task?.content) || findVideoUrl(task?.output) || findVideoUrl(task?.result) || findVideoUrl(task);
  const progress = status === "succeeded" ? 100 : Number.isFinite(Number(task?.progress)) ? Number(task.progress) : status === "running" ? 50 : 5;
  const errorMessage = task?.error?.message || task?.error?.detail || data?.error?.message;

  return {
    id,
    model: task?.model,
    status,
    progress,
    outputUrl,
    message: String(errorMessage || task?.message || (status === "succeeded" ? "Video Mureka selesai dibuat." : `Status Mureka: ${status}.`)),
    raw: data,
  };
}
