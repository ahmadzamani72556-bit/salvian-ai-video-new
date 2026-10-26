import type { LongFormShot, LongFormProvider } from "./long-form-engine";

export type ProviderTask = { provider: LongFormProvider; taskId: string };
export type ProviderStatus = { status: "queued" | "running" | "succeeded" | "failed"; outputUrl?: string; message?: string };

const clean = (v?: string) => v?.replace(/\/$/, "") || "";
const resolution = (v: string) => v === "4K" ? "4k" : v === "720p" ? "720p" : "1080p";
const ratio = (v?: string) => ["16:9","9:16","1:1","4:3","3:4","21:9"].includes(v || "") ? v : "16:9";

function requireValue(name: string, value?: string) { if (!value) throw new Error(`${name} belum dikonfigurasi di server.`); return value; }

export async function submitProvider(provider: LongFormProvider, shot: LongFormShot, project: any, settings: any): Promise<ProviderTask> {
  if (provider === "seedance-2.5") return submitSeedance(shot, project, settings);
  if (provider === "kling-3.0-omni") return submitKling(shot, project, settings);
  return submitVeo(shot, project, settings);
}

async function submitSeedance(shot: LongFormShot, project: any, settings: any): Promise<ProviderTask> {
  const key = requireValue("SEEDANCE_API_KEY", process.env.SEEDANCE_API_KEY);
  const base = clean(process.env.SEEDANCE_API_URL || "https://ark.cn-beijing.volces.com/api/v3");
  const refs = Array.isArray(project?.referenceImages) ? project.referenceImages : Array.isArray(project?.images) ? project.images : [];
  const content: any[] = [{ type: "text", text: shot.prompt }];
  for (const item of refs.slice(0, 30)) {
    const url = typeof item === "string" ? item : item?.url;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
  }
  const response = await fetch(`${base}/contents/generations/tasks`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.SEEDANCE_MODEL || "doubao-seedance-2-5-260628", content, generate_audio: true, ratio: ratio(project?.ratio), duration: Math.max(4, Math.min(30, Math.round(shot.duration))), resolution: resolution(settings.resolution), output_format: "mp4", omni_reference_task_type: content.length > 1 ? "reference" : "auto" }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id) throw new Error("Seedance tidak menerima tugas produksi.");
  return { provider: "seedance-2.5", taskId: String(data.id) };
}

async function submitKling(shot: LongFormShot, project: any, settings: any): Promise<ProviderTask> {
  const key = requireValue("KLING_API_KEY", process.env.KLING_API_KEY);
  const base = clean(process.env.KLING_API_URL || "https://api-singapore.klingai.com");
  const response = await fetch(`${base}/text-to-video/kling-3.0`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ prompt: shot.prompt, settings: { resolution: resolution(settings.resolution), aspect_ratio: ratio(project?.ratio), duration: Math.max(3, Math.min(15, Math.round(shot.duration))), audio: "native", multi_shot: false }, options: { watermark_info: { enabled: false }, external_task_id: shot.id } }) });
  const data = await response.json().catch(() => ({}));
  const id = data?.data?.task_id || data?.task_id;
  if (!response.ok || !id) throw new Error("Kling tidak menerima tugas produksi.");
  return { provider: "kling-3.0-omni", taskId: String(id) };
}

async function submitVeo(shot: LongFormShot, project: any, settings: any): Promise<ProviderTask> {
  const key = requireValue("VEO_API_KEY", process.env.VEO_API_KEY);
  const base = clean(process.env.VEO_API_URL || "https://generativelanguage.googleapis.com/v1beta");
  const model = process.env.VEO_MODEL || "veo-3.1-generate-001";
  const response = await fetch(`${base}/models/${model}:predictLongRunning`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ instances: [{ prompt: shot.prompt }], parameters: { aspectRatio: ratio(project?.ratio), durationSeconds: Math.max(4, Math.min(8, Math.round(shot.duration))), resolution: resolution(settings.resolution) } }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.name) throw new Error("Veo tidak menerima tugas produksi.");
  return { provider: "veo-3.1", taskId: String(data.name) };
}

export async function getProviderStatus(provider: LongFormProvider, taskId: string): Promise<ProviderStatus> {
  if (provider === "seedance-2.5") return getSeedanceStatus(taskId);
  if (provider === "kling-3.0-omni") return getKlingStatus(taskId);
  return getVeoStatus(taskId);
}

async function getSeedanceStatus(taskId: string): Promise<ProviderStatus> {
  const key = requireValue("SEEDANCE_API_KEY", process.env.SEEDANCE_API_KEY); const base = clean(process.env.SEEDANCE_API_URL || "https://ark.cn-beijing.volces.com/api/v3");
  const r = await fetch(`${base}/contents/generations/tasks/${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error("Status Seedance tidak dapat dibaca."); const s = String(d?.status || "").toLowerCase(); const map = s === "succeeded" ? "succeeded" : s === "failed" ? "failed" : s === "cancelled" ? "failed" : s === "running" || s === "processing" ? "running" : "queued"; return { status: map, outputUrl: d?.content?.video_url || d?.content?.videoUrl, message: map === "succeeded" ? "Shot visual selesai." : map === "failed" ? "Shot visual gagal." : "Salvian sedang membuat shot visual." };
}

async function getKlingStatus(taskId: string): Promise<ProviderStatus> {
  const key = requireValue("KLING_API_KEY", process.env.KLING_API_KEY); const base = clean(process.env.KLING_API_URL || "https://api-singapore.klingai.com");
  const r = await fetch(`${base}/v1/videos/text2video/${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error("Status Kling tidak dapat dibaca."); const s = String(d?.data?.task_status || "").toLowerCase(); const map = s === "succeed" || s === "succeeded" ? "succeeded" : s === "failed" ? "failed" : s === "processing" ? "running" : "queued"; return { status: map, outputUrl: d?.data?.task_result?.videos?.[0]?.url, message: map === "succeeded" ? "Shot visual selesai." : map === "failed" ? "Shot visual gagal." : "Salvian sedang membuat shot visual." };
}

async function getVeoStatus(taskId: string): Promise<ProviderStatus> {
  const key = requireValue("VEO_API_KEY", process.env.VEO_API_KEY); const base = clean(process.env.VEO_API_URL || "https://generativelanguage.googleapis.com/v1beta");
  const r = await fetch(`${base}/${taskId.replace(/^\//, "")}`, { headers: { "x-goog-api-key": key }, cache: "no-store" }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error("Status Veo tidak dapat dibaca."); if (!d?.done) return { status: "running", message: "Salvian sedang membuat shot visual." }; const url = d?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || d?.response?.generatedVideos?.[0]?.video?.uri; return { status: url ? "succeeded" : "failed", outputUrl: url, message: url ? "Shot visual selesai." : "Shot visual gagal." };
}
