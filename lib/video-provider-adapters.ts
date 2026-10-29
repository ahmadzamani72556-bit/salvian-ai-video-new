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
    const message = data?.error?.message || (typeof data?.error === "string" ? data.error : "") || data?.message || ("Mureka API gagal (HTTP " + response.status + ").");
    const trace = data?.trace_id || data?.traceId;
    throw new Error((String(message) + " (HTTP " + response.status + ")" + (trace ? " · trace_id: " + String(trace) : "")).slice(0, 400));
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
  // Let Mureka choose its compatible video model unless an explicit supported model is configured.
  const model = process.env.MUREKA_VIDEO_MODEL?.trim() || "doubao-seedance-2-5-260628";
  const requestedResolution = String(settings?.resolution || "720p").toLowerCase();
  const resolution = ["480p", "720p", "1080p"].includes(requestedResolution) ? requestedResolution : "720p";
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
  if (!Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 15) throw new Error("Durasi setiap segmen Mureka harus antara 1 dan 15 detik; lagu panjang wajib dibagi otomatis.");
  const audioStartSeconds = Math.max(0, Math.round(Number(shot?.audioStartSeconds || 0)));
  const audioEndSeconds = Math.max(audioStartSeconds + durationSeconds, Math.round(Number(shot?.audioEndSeconds || audioStartSeconds + durationSeconds)));

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

  const music = {
    url: audioUrl,
    audio_start: audioStartSeconds * 1000,
    audio_end: audioEndSeconds * 1000,
  };
  const ratio = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"].includes(String(project?.ratio || "16:9"))
    ? String(project?.ratio || "16:9")
    : "16:9";
  const imageContent = content.filter((item) => item.type === "image");
  const textContent = [{ type: "text", text: visualPrompt }];
  const imageUrlContent = imageContent.map((item:any) => ({ type: "image_url", image_url: { url: String(item.url || "") } }));
  const variants = [
    { music, video: { model, content: textContent, duration: durationSeconds, ratio, resolution } },
    { music, video: { model, prompt: visualPrompt, duration: durationSeconds, ratio, resolution } },
    { music, video: { prompt: visualPrompt, duration: durationSeconds, ratio, resolution } },
    { music, video: { model, content, duration: durationSeconds, ratio, resolution } },
    { music, video: { content: [...textContent, ...imageUrlContent], duration: durationSeconds, ratio, resolution } },
    { music, video: { model, content: textContent, ratio, resolution } },
    { music, video: { model, content, ratio, resolution } },
    { music, video: { content: [...textContent, ...imageUrlContent], ratio, resolution } },
    { music, video: { prompt: visualPrompt, ratio, resolution } },
    { music, video: { model, prompt: visualPrompt, ratio, resolution } },
    { music, video: { prompt: visualPrompt } },
  ];
  let data: any;
  let lastError: unknown;
  for (let index = 0; index < variants.length; index += 1) {
    try {
      data = await readJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
        body: JSON.stringify(variants[index]),
      });
      break;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Try alternate documented field shapes only for an explicit parameter-validation response.
      if (/HTTP 400/.test(message) && index < variants.length - 1) continue;
      throw error;
    }
  }
  if (!data) throw lastError instanceof Error ? lastError : new Error("Mureka tidak mengembalikan respons tugas.");
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
