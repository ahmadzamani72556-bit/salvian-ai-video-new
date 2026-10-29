import type { LongFormShot, LongFormProvider } from "./long-form-engine";

export type ProviderTask = { provider: LongFormProvider; taskId: string };
export type ProviderStatus = {
  status: "queued" | "running" | "succeeded" | "failed";
  outputUrl?: string;
  message?: string;
};

const API_BASE = "https://api.mureka.ai";
const DEFAULT_GENERATE_URL = API_BASE + "/v1/video/generate";
const DEFAULT_QUERY_TEMPLATE = API_BASE + "/v1/video/query/{task_id}";

const required = (name: string, value?: string) => {
  if (!value?.trim()) throw new Error(name + " belum dikonfigurasi di server.");
  return value.trim();
};

async function readJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || ("Mureka API gagal (HTTP " + response.status + ").");
    throw new Error(String(message).slice(0, 400));
  }
  return data;
}

function idOf(data: any): string | undefined {
  const id = data?.task_id || data?.taskId || data?.id || data?.data?.task_id || data?.data?.taskId || data?.data?.id;
  return id == null ? undefined : String(id);
}

function unwrap(data: any): any {
  if (data?.data && typeof data.data === "object") return data.data;
  if (data?.task && typeof data.task === "object") return data.task;
  return data;
}

function findVideoUrl(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : undefined;
  if (Array.isArray(value)) {
    for (const item of value) { const found = findVideoUrl(item); if (found) return found; }
    return undefined;
  }
  if (typeof value === "object") {
    for (const key of ["video_url", "videoUrl", "output_url", "outputUrl", "download_url", "downloadUrl", "url", "video", "content", "result", "choices"]) {
      if (key in value) { const found = findVideoUrl(value[key]); if (found) return found; }
    }
  }
  return undefined;
}

function modelAndResolution(settings: any) {
  const requestedModel = process.env.MUREKA_VIDEO_MODEL?.trim();
  const requestedResolution = String(settings?.resolution || "720p").toLowerCase();
  const wantsHighResolution = requestedResolution === "1080p" || requestedResolution === "4k";
  const model = requestedModel || (wantsHighResolution ? "doubao-seedance-2-0-260128" : "doubao-seedance-2-5-260628");
  const supported = model.includes("2-5") || model.includes("mini") || model.includes("fast")
    ? ["480p", "720p"]
    : ["480p", "720p", "1080p", "4k"];
  const resolution = supported.includes(requestedResolution) ? requestedResolution : (supported.includes("1080p") && wantsHighResolution ? requestedResolution : "720p");
  return { model, resolution };
}

export async function submitProvider(
  provider: LongFormProvider,
  shot: LongFormShot,
  project: any,
  settings: any
): Promise<ProviderTask> {
  if (provider !== "mureka") throw new Error("Kling dan Veo telah dinonaktifkan.");
  if (process.env.VIDEO_ENGINE_INTERNAL_URL && process.env.VIDEO_ENGINE_INTERNAL_TOKEN) {
    const base = process.env.VIDEO_ENGINE_INTERNAL_URL.replace(/\/$/, "");
    const data = await readJson(base + "/api/internal/video-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-salvian-engine-token": process.env.VIDEO_ENGINE_INTERNAL_TOKEN },
      body: JSON.stringify({ action: "submit", provider, shot, project, settings }),
    });
    const id = idOf(data);
    if (!id) throw new Error("Mesin internal tidak mengembalikan task ID; job dihentikan agar tidak mengaku produksi berjalan.");
    return { provider: "mureka", taskId: id };
  }
  return submitProviderLocal(provider, shot, project, settings);
}

export async function getProviderStatus(provider: LongFormProvider, taskId: string): Promise<ProviderStatus> {
  if (provider !== "mureka") throw new Error("Status Kling dan Veo dinonaktifkan.");
  if (process.env.VIDEO_ENGINE_INTERNAL_URL && process.env.VIDEO_ENGINE_INTERNAL_TOKEN) {
    const base = process.env.VIDEO_ENGINE_INTERNAL_URL.replace(/\/$/, "");
    return readJson(base + "/api/internal/video-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-salvian-engine-token": process.env.VIDEO_ENGINE_INTERNAL_TOKEN },
      body: JSON.stringify({ action: "status", provider, taskId }),
    });
  }
  return getProviderStatusLocal(provider, taskId);
}

/**
 * Mureka's documented music-video contract nests source audio under "music"
 * and generation controls under "video". Do not send the older, unsupported
 * flat audio_url/prompt/duration payload.
 */
export async function submitProviderLocal(
  provider: LongFormProvider,
  shot: LongFormShot,
  project: any,
  settings: any
): Promise<ProviderTask> {
  if (provider !== "mureka") throw new Error("Kling dan Veo dinonaktifkan.");
  const apiKey = required("MUREKA_API_KEY", process.env.MUREKA_API_KEY);
  const url = process.env.MUREKA_VIDEO_GENERATE_URL?.trim() || DEFAULT_GENERATE_URL;
  const audioUrl = String(project?.musicAsset?.url || project?.audio?.url || "").trim();
  if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
    throw new Error("URL lagu penuh yang dapat diakses publik tidak ditemukan. Unggah lagu terlebih dahulu.");
  }

  const durationSeconds = Math.max(1, Math.round(Number(shot?.duration || project?.musicAsset?.durationSeconds || 0)));
  if (!Number.isFinite(durationSeconds) || durationSeconds < 1) throw new Error("Durasi video tidak valid.");

  const { model, resolution } = modelAndResolution(settings);
  const visualPrompt = String(shot?.prompt || project?.script || project?.sourcePrompt || project?.topic || "Create a cinematic music video matching the uploaded song.").trim();
  const content: Array<Record<string, unknown>> = [{ type: "text", text: visualPrompt }];

  // Mureka accepts reference images as content items. Keep only public HTTP(S)
  // URLs; do not leak browser File objects or internal asset metadata.
  const assets = Array.isArray(project?.assets) ? project.assets : [];
  for (const asset of assets) {
    const imageUrl = String(asset?.url || "").trim();
    const mime = String(asset?.mimeType || asset?.type || "").toLowerCase();
    if (/^https?:\/\//i.test(imageUrl) && (mime.startsWith("image/") || /\.(png|jpe?g|webp)(?:[?#]|$)/i.test(imageUrl))) {
      content.push({ type: "image", url: imageUrl });
    }
  }

  const payload = {
    music: {
      url: audioUrl,
      audio_start: 0,
      audio_end: durationSeconds * 1000,
      show_lyrics_subtitle: Boolean(project?.showLyricsSubtitle ?? true),
      lip_sync: Boolean(project?.lipSync ?? true),
      background: String(project?.background || "Cinematic, natural lighting, realistic performance, coherent scenes that follow the music."),
      prompt: visualPrompt,
    },
    video: {
      model,
      content,
      duration: durationSeconds,
      execution_expires_after: 172800,
      generate_audio: true,
      ratio: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"].includes(String(project?.ratio || "16:9"))
        ? String(project?.ratio || "16:9")
        : "16:9",
      resolution,
    },
  };

  const data = await readJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify(payload),
  });
  const id = idOf(data);
  if (!id) throw new Error("Respons Mureka tidak berisi task ID. Periksa respons API pada log server.");
  return { provider: "mureka", taskId: id };
}

export async function getProviderStatusLocal(provider: LongFormProvider, taskId: string): Promise<ProviderStatus> {
  if (provider !== "mureka") throw new Error("Kling dan Veo dinonaktifkan.");
  const apiKey = required("MUREKA_API_KEY", process.env.MUREKA_API_KEY);
  const template = process.env.MUREKA_VIDEO_QUERY_URL_TEMPLATE?.trim()
    || process.env.MUREKA_VIDEO_POLL_TEMPLATE?.trim()
    || DEFAULT_QUERY_TEMPLATE;
  const url = template.replace(/\{(?:taskId|task_id|id)\}/g, encodeURIComponent(taskId));
  const data = await readJson(url, { method: "GET", headers: { Authorization: "Bearer " + apiKey } });
  const payload = unwrap(data);
  const status = String(payload?.status || payload?.state || payload?.task_status || "").toLowerCase();
  const outputUrl = findVideoUrl(payload?.content) || findVideoUrl(payload?.output) ||
    findVideoUrl(payload?.result) || findVideoUrl(payload?.video) ||
    findVideoUrl(payload?.choices) || findVideoUrl(payload?.data);
  const failed = ["failed", "error", "cancelled", "canceled", "timeouted", "timeout", "expired"].includes(status);
  const succeeded = ["succeeded", "success", "completed", "complete", "done"].includes(status);
  const running = ["running", "processing", "streaming", "generating", "in_progress"].includes(status);
  return {
    status: failed ? "failed" : succeeded && outputUrl ? "succeeded" : running || succeeded ? "running" : "queued",
    outputUrl: succeeded ? outputUrl : undefined,
    message: String(payload?.failed_reason || payload?.message || payload?.error?.message || (succeeded && !outputUrl ? "Mureka menandai tugas selesai tetapi belum memberikan URL video." : "")),
  };
}
