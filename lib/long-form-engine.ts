export type LongFormProvider = "mureka";
export type LongFormStage = "planning" | "music-analysis" | "shot-planning" | "generation" | "continuity" | "audio" | "assembly" | "finalizing";
export type ProductionLog = { at:string; stage:LongFormStage; label:string; detail?:string; provider?:LongFormProvider; progress:number };
export type MusicGuide = { url?:string; name?:string; durationSeconds?:number; bpm?:number; beatOffsetSeconds?:number; energy?:"low"|"medium"|"high"; syncMode?:"beat"|"phrase"|"free" };
export type LongFormShot = { id:string; scene:number; duration:number; prompt:string; provider:LongFormProvider; referenceShotId?:string; extendFrom?:string; beatStart?:number; beatEnd?:number };
export type LongFormPlan = { durationSeconds:number; shots:LongFormShot[]; music?:MusicGuide; logs:ProductionLog[] };
const now=()=>new Date().toISOString(); const log=(logs:ProductionLog[],stage:LongFormStage,label:string,progress:number,detail?:string,provider?:LongFormProvider)=>logs.push({at:now(),stage,label,detail,provider,progress});
export function providerReady(provider:LongFormProvider):boolean { return provider==="mureka" && Boolean(process.env.MUREKA_API_KEY && process.env.MUREKA_VIDEO_GENERATE_URL && process.env.MUREKA_VIDEO_POLL_TEMPLATE); }
export function buildLongFormPlan(project:any):LongFormPlan {
 const music:MusicGuide|undefined=project?.musicAsset||undefined;
 const durationSeconds=Math.round(Number(music?.durationSeconds||project?.durationSeconds||project?.audioDurationSeconds||0));
 if(!music?.url || !Number.isFinite(durationSeconds) || durationSeconds<10) throw new Error("Unggah lagu lengkap dan pastikan durasi audio terbaca sebelum membuat video musik Mureka.");
 const logs:ProductionLog[]=[]; log(logs,"planning","Produksi video musik Mureka diterima",4,"Durasi lagu "+durationSeconds+" detik","mureka");
 log(logs,"music-analysis","Menyiapkan lagu penuh",10,music.name||"Audio lagu","mureka");
 log(logs,"shot-planning","Menyiapkan satu output final",16,"Video musik mengikuti durasi lagu lengkap; Kling dan Veo dinonaktifkan.","mureka");
 return {durationSeconds,shots:[{id:"mureka-full-song",scene:1,duration:durationSeconds,prompt:String(project?.script||project?.topic||project?.title||"Music video synchronized to the full uploaded song"),provider:"mureka"}],music,logs};
}
export function missingProviderConfiguration(_plan:LongFormPlan){return providerReady("mureka")?[]:["mureka"]; }
export function providerEndpoint(_provider:LongFormProvider){return process.env.MUREKA_VIDEO_GENERATE_URL||"";}
