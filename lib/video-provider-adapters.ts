import type { LongFormShot, LongFormProvider } from "./long-form-engine";

export type ProviderTask = { provider: LongFormProvider; taskId: string };
export type ProviderStatus = { status: "queued" | "running" | "succeeded" | "failed"; outputUrl?: string; message?: string };

const clean = (v?: string) => v?.replace(/\/$/, "") || "";
const resolution = (v: string) => v === "4K" ? "4k" : v === "720p" ? "720p" : "1080p";
const ratio = (v?: string) => ["16:9","9:16","1:1"].includes(v || "") ? v : "16:9";
function requireValue(name: string, value?: string) { if (!value) throw new Error(`${name} belum dikonfigurasi di server.`); return value; }

export async function submitProvider(provider: LongFormProvider, shot: LongFormShot, project: any, settings: any): Promise<ProviderTask> {
  if (provider === "seedance-2.5") return submitSeedance(shot, project, settings);
  if (provider === "kling-3.0-omni") return submitKling(shot, project, settings);
  return submitVeo(shot, project, settings);
}

async function submitSeedance(shot: LongFormShot, project: any, settings: any): Promise<ProviderTask> {
  const key = requireValue("SEEDANCE_API_KEY", process.env.SEEDANCE_API_KEY);
  const base = clean(process.env.SEEDANCE_API_URL || "https://ark.cn-beijing.volces.com/api/v3");
  const refs = Array.isArray(project?.referenceImages) ? project.referenceImages : Array.isArray(project?.images) ? project.images : Array.isArray(project?.sourceAssets) ? project.sourceAssets : [];
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
  const id = data?.data?.id || data?.data?.task_id || data?.task_id;
  if (!response.ok || !id) throw new Error("Kling tidak menerima tugas produksi.");
  return { provider: "kling-3.0-omni", taskId: String(id) };
}

function veoAuth() {
  return requireValue("VEO_ACCESS_TOKEN", process.env.VEO_ACCESS_TOKEN || process.env.GOOGLE_CLOUD_ACCESS_TOKEN);
}
function veoBase() { return clean(process.env.VEO_API_URL || "https://us-central1-aiplatform.googleapis.com/v1"); }
function veoProject() { return requireValue("GOOGLE_CLOUD_PROJECT", process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID); }
function veoLocation() { return process.env.GOOGLE_CLOUD_LOCATION || "us-central1"; }

async function submitVeo(shot: LongFormShot, project: any, settings: any): Promise<ProviderTask> {
  const token = veoAuth(); const projectId = veoProject(); const location = veoLocation();
  const model = process.env.VEO_MODEL || "veo-3.1-generate-001";
  const base = veoBase();
  const response = await fetch(`${base}/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:predictLongRunning`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ instances: [{ prompt: shot.prompt }], parameters: { aspectRatio: ratio(project?.ratio), durationSeconds: Math.max(4, Math.min(8, Math.round(shot.duration))), resolution: resolution(settings.resolution), sampleCount: 1, ...(process.env.VEO_OUTPUT_STORAGE_URI ? { storageUri: process.env.VEO_OUTPUT_STORAGE_URI } : {}) } }) });
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
  const r = await fetch(`${base}/contents/generations/tasks/${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }); const d = await r.json().catch(()=>({})); if (!r.ok) throw new Error("Status Seedance tidak dapat dibaca."); const s=String(d?.status||d?.data?.status||"").toLowerCase(); const map=s==="succeeded"?"succeeded":s==="failed"||s==="cancelled"?"failed":s==="running"||s==="processing"?"running":"queued"; return {status:map,outputUrl:d?.content?.video_url||d?.content?.videoUrl||d?.data?.content?.video_url,message:map==="succeeded"?"Shot visual selesai.":map==="failed"?"Shot visual gagal.":"Salvian sedang membuat shot visual."};
}

async function getKlingStatus(taskId: string): Promise<ProviderStatus> {
  const key = requireValue("KLING_API_KEY", process.env.KLING_API_KEY); const base = clean(process.env.KLING_API_URL || "https://api-singapore.klingai.com");
  const r = await fetch(`${base}/text-to-video/kling-3.0/${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }); const d = await r.json().catch(()=>({})); if (!r.ok) throw new Error("Status Kling tidak dapat dibaca."); const raw=String(d?.data?.status||d?.data?.task_status||"").toLowerCase(); const map=raw==="succeeded"||raw==="succeed"?"succeeded":raw==="failed"||raw==="cancelled"?"failed":raw==="processing"||raw==="submitted"?"running":"queued"; const output=d?.data?.outputs?.find((x:any)=>x?.type==="video")?.url||d?.data?.task_result?.videos?.[0]?.url; return {status:map,outputUrl:output,message:map==="succeeded"?"Shot visual selesai.":map==="failed"?"Shot visual gagal.":"Salvian sedang membuat shot visual."};
}

async function getVeoStatus(taskId: string): Promise<ProviderStatus> {
  const token=veoAuth(); const base=veoBase(); const path=taskId.startsWith("http")?taskId:new URL(taskId,`${base}/`).toString(); const r=await fetch(path,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}); const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error("Status Veo tidak dapat dibaca."); if(!d?.done)return {status:"running",message:"Salvian sedang membuat shot visual."}; if(d?.error)return {status:"failed",message:"Shot Veo gagal diproduksi."}; const url=d?.response?.videos?.[0]?.gcsUri||d?.response?.generatedVideos?.[0]?.video?.uri||d?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri; return {status:url?"succeeded":"failed",outputUrl:url,message:url?"Shot visual selesai.":"Shot Veo selesai tanpa output video."};
}
