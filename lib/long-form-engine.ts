export type LongFormProvider = "mureka";
export type LongFormStage = "planning" | "music-analysis" | "shot-planning" | "generation" | "continuity" | "audio" | "assembly" | "finalizing";
export type ProductionLog = { at:string; stage:LongFormStage; label:string; detail?:string; provider?:LongFormProvider; progress:number };
export type MusicGuide = { url?:string; name?:string; durationSeconds?:number; bpm?:number; beatOffsetSeconds?:number; energy?:"low"|"medium"|"high"; syncMode?:"beat"|"phrase"|"free" };
export type LongFormShot = { id:string; scene:number; duration:number; prompt:string; provider:LongFormProvider; referenceShotId?:string; extendFrom?:string; beatStart?:number; beatEnd?:number; audioStartSeconds?:number; audioEndSeconds?:number };
export type LongFormPlan = { version:string; durationSeconds:number; shots:LongFormShot[]; music?:MusicGuide; logs:ProductionLog[] };
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
 // Mureka rejects a single request for a several-minute song. Divide the full timeline
 // into continuous segments no longer than 15 seconds; assembly restores one master file.
 const segmentCount=Math.ceil(durationSeconds/15);
 const baseDuration=Math.floor(durationSeconds/segmentCount);
 const remainder=durationSeconds%segmentCount;
 let cursor=0;
 const phases=[
  {at:0.12,label:"intro sinematik"},
  {at:0.38,label:"bait pertama"},
  {at:0.58,label:"reff utama"},
  {at:0.76,label:"bait kedua"},
  {at:0.9,label:"bridge emosional"},
  {at:1,label:"reff akhir dan penutup"}
 ];
 const shots:LongFormShot[]=Array.from({length:segmentCount},(_,index)=>{
  const segmentDuration=baseDuration+(index<remainder?1:0);
  const startSeconds=cursor;
  const endSeconds=startSeconds+segmentDuration;
  cursor=endSeconds;
  const phase=phases.find(item=>endSeconds/durationSeconds<=item.at)||phases[phases.length-1];
  const prompt=[
   "CINEMATIC MUSIC VIDEO SEGMENT. This is segment "+(index+1)+" of "+segmentCount+" for the same complete song.",
   "Render exactly "+segmentDuration+" seconds for source-song time "+startSeconds+" to "+endSeconds+" seconds.",
   "Visual section: "+phase.label+". Continue the same visual world, performers, wardrobe, lighting, and color grade from adjacent segments; use natural transitions and varied cinematic camera movement.",
   "Project: "+title+".",
   visualGuidance?"Visual direction: "+visualGuidance+".":"Use uploaded reference photos as the visual performers and build scenes that evolve with the music.",
   "Aspect ratio: "+String(project?.ratio||"16:9")+".",
   "Do not add a new soundtrack, title cards, logos, watermarks, or unrelated scenes. Keep the segment aligned to the exact supplied song interval."
  ].join("\n");
  return {id:"mureka-segment-"+String(index+1).padStart(3,"0"),scene:index+1,duration:segmentDuration,audioStartSeconds:startSeconds,audioEndSeconds:endSeconds,prompt,provider:"mureka"};
 });
 const logs:ProductionLog[]=[];
 log(logs,"planning","Produksi video musik berdurasi penuh diterima",4,"Target durasi mengikuti audio: "+durationSeconds+" detik","mureka");
 log(logs,"music-analysis","Memvalidasi lagu penuh",10,`${music.name||"Audio lagu"} · ${durationSeconds} detik`,"mureka");
 log(logs,"shot-planning","Membagi lagu menjadi segmen berurutan",16,`${shots.length} segmen maksimal 15 detik; seluruhnya akan dirakit menjadi satu video final.`,"mureka");
 return {version:"mureka-segment-v5",durationSeconds,shots,music,logs};
}
export function missingProviderConfiguration(_plan:LongFormPlan){return providerReady("mureka")?[]:["mureka"];}
export function providerEndpoint(_provider:LongFormProvider){return process.env.MUREKA_VIDEO_GENERATE_URL||"https://api.mureka.ai/v1/video/generate";}
