export type LongFormProvider = "mureka";
export type LongFormStage = "planning" | "music-analysis" | "shot-planning" | "generation" | "continuity" | "audio" | "assembly" | "finalizing";
export type ProductionLog = { at:string; stage:LongFormStage; label:string; detail?:string; provider?:LongFormProvider; progress:number };
export type MusicGuide = { url?:string; name?:string; durationSeconds?:number; bpm?:number; beatOffsetSeconds?:number; energy?:"low"|"medium"|"high"; syncMode?:"beat"|"phrase"|"free" };
export type LongFormShot = { id:string; scene:number; duration:number; prompt:string; provider:LongFormProvider; referenceShotId?:string; extendFrom?:string; beatStart?:number; beatEnd?:number };
export type LongFormPlan = { durationSeconds:number; shots:LongFormShot[]; music?:MusicGuide; logs:ProductionLog[] };
const now=()=>new Date().toISOString(); const log=(logs:ProductionLog[],stage:LongFormStage,label:string,progress:number,detail?:string,provider?:LongFormProvider)=>logs.push({at:now(),stage,label,detail,provider,progress});

/**
 * Readiness must match the adapter's real configuration contract. Mureka's
 * official API host and video endpoints have safe server-side defaults, so
 * custom URL variables are optional. Only the API key (or a complete internal
 * engine connection) is required to mark the provider ready.
 */
export function providerReady(provider:LongFormProvider):boolean {
 if(provider!=="mureka") return false;
 if(process.env.VIDEO_ENGINE_INTERNAL_URL?.trim() && process.env.VIDEO_ENGINE_INTERNAL_TOKEN?.trim()) return true;
 return Boolean(process.env.MUREKA_API_KEY?.trim());
}
export function buildLongFormPlan(project:any):LongFormPlan {
 const music:MusicGuide|undefined=project?.musicAsset||undefined;
 const durationSeconds=Math.round(Number(music?.durationSeconds||project?.durationSeconds||project?.audioDurationSeconds||0));
 if(!music?.url || !Number.isFinite(durationSeconds) || durationSeconds<10) throw new Error("Unggah lagu lengkap dan pastikan durasi audio terbaca sebelum membuat video musik Mureka.");
 const title=String(project?.title||"Video Musik").trim();
 const visualGuidance=String(project?.script||project?.sourcePrompt||project?.topic||"").trim();
 const prompt=[`FULL-LENGTH MUSIC VIDEO. Create one continuous music-video output for the entire uploaded song, exactly targeting ${durationSeconds} seconds. Do not create a 5–15 second teaser, preview, sample, or short clip. Do not truncate the song. Use the uploaded song as the sole timing reference and keep the full audio duration.`, `Project: ${title}.`, visualGuidance?`Visual direction: ${visualGuidance}.`:"Use the uploaded reference photos as the visual performers and build scenes that evolve with the music.", `Aspect ratio: ${String(project?.ratio||"16:9")}.`, "Return the completed full-length music video task, not a storyboard or a collection of unrelated short clips."].join("\n");
 const logs:ProductionLog[]=[]; log(logs,"planning","Produksi video musik berdurasi penuh diterima",4,"Target durasi mengikuti audio: "+durationSeconds+" detik","mureka");
 log(logs,"music-analysis","Memvalidasi lagu penuh",10,`${music.name||"Audio lagu"} · ${durationSeconds} detik`,"mureka");
 log(logs,"shot-planning","Mengunci satu tugas video musik utuh",16,"Satu tugas full-song; jalur klip pendek tidak digunakan sebagai fallback.","mureka");
 return {durationSeconds,shots:[{id:"mureka-full-song",scene:1,duration:durationSeconds,prompt,provider:"mureka"}],music,logs};
}
export function missingProviderConfiguration(_plan:LongFormPlan){return providerReady("mureka")?[]:["mureka"];}
export function providerEndpoint(_provider:LongFormProvider){return process.env.MUREKA_VIDEO_GENERATE_URL||"https://api.mureka.ai/v1/video/generate";}
