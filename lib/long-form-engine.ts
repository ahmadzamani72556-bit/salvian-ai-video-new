export type LongFormProvider = "seedance-2.5" | "kling-3.0-omni" | "veo-3.1";
export type LongFormStage = "planning" | "music-analysis" | "shot-planning" | "generation" | "continuity" | "audio" | "assembly" | "finalizing";
export type ProductionLog = { at:string; stage:LongFormStage; label:string; detail?:string; provider?:LongFormProvider; progress:number };
export type MusicGuide = { url?:string; name?:string; durationSeconds?:number; bpm?:number; beatOffsetSeconds?:number; energy?:"low"|"medium"|"high"; syncMode?:"beat"|"phrase"|"free" };
export type LongFormShot = { id:string; scene:number; duration:number; prompt:string; provider:LongFormProvider; referenceShotId?:string; extendFrom?:string; beatStart?:number; beatEnd?:number };
export type LongFormPlan = { durationSeconds:number; shots:LongFormShot[]; music?:MusicGuide; logs:ProductionLog[] };
const now=()=>new Date().toISOString();
const log=(logs:ProductionLog[],stage:LongFormStage,label:string,progress:number,detail?:string,provider?:LongFormProvider)=>logs.push({at:now(),stage,label,detail,provider,progress});
const providers:[LongFormProvider,number,number][]=[["seedance-2.5",4,30],["kling-3.0-omni",3,15],["veo-3.1",4,8]];
export function providerReady(provider:LongFormProvider):boolean { if(provider==="seedance-2.5") return Boolean(process.env.SEEDANCE_API_KEY); if(provider==="kling-3.0-omni") return Boolean(process.env.KLING_API_KEY); return Boolean(process.env.VEO_ACCESS_TOKEN||process.env.GOOGLE_CLOUD_ACCESS_TOKEN||process.env.GOOGLE_SERVICE_ACCOUNT_JSON); }
function readyProviders():LongFormProvider[]{return (["seedance-2.5","kling-3.0-omni","veo-3.1"] as LongFormProvider[]).filter(providerReady);}
function chooseProvider(scene:any,index:number):LongFormProvider {
 const ready=readyProviders();
 if(!ready.length)return "seedance-2.5";
 const text=String([scene?.title,scene?.visual,scene?.voice].filter(Boolean).join(" ")).toLowerCase();
 const preferred=/dialog|dialogue|berbicara|voice|nyanyi|sing/.test(text)?"kling-3.0-omni":/realistic|photoreal|hero|cinematic|close-up|close up/.test(text)?"veo-3.1":"";
 if(preferred&&ready.includes(preferred as LongFormProvider))return preferred as LongFormProvider;
 return ready[index%ready.length];
}
function makeBeatWindows(total:number,bpm?:number,offset=0){if(!bpm||bpm<=0)return[];const step=60/bpm,points:number[]=[];for(let t=Math.max(0,offset);t<total;t+=step)points.push(Number(t.toFixed(3)));return points;}
function splitDuration(total:number,min:number,max:number){const safe=Math.max(min,total);let count=Math.ceil(safe/max);const maxCount=Math.max(count,Math.floor(safe/min));if(count>maxCount)count=maxCount;const base=Math.floor(safe/count),remainder=Math.round(safe-base*count);const values=Array.from({length:count},(_,i)=>base+(i<remainder?1:0));if(values.some(v=>v<min||v>max))throw new Error(`Durasi shot ${total}s tidak dapat dipetakan ke batas engine.`);return values;}
export function buildLongFormPlan(project:any):LongFormPlan {
 const durationSeconds=Math.round(Number(project?.duration||7)*60); if(![300,360,420,480].includes(durationSeconds)) throw new Error("Durasi long-form harus 5, 6, 7, atau 8 menit.");
 const logs:ProductionLog[]=[]; log(logs,"planning","Salvian Director menyusun film utuh",4,`${durationSeconds/60} menit · satu output final`);
 const scenes=Array.isArray(project?.scenes)&&project.scenes.length?project.scenes:[{number:1,title:"Opening",visual:project?.topic||project?.script||"",duration:durationSeconds,voice:""}];
 const music:MusicGuide|undefined=project?.musicAsset||undefined; if(music)log(logs,"music-analysis","Menganalisis lagu dan ritme",9,music.name||"Audio reference");
 const beats=makeBeatWindows(durationSeconds,music?.bpm,music?.beatOffsetSeconds||0); const shots:LongFormShot[]=[]; let cursor=0,sequence=0;
 for(const scene of scenes){
  const sceneSeconds=Math.max(1,Number(scene.duration)||1); const provider=chooseProvider(scene,sequence); const [,min,max]=providers.find(p=>p[0]===provider)!; const durations=splitDuration(sceneSeconds,min,max);
  for(let i=0;i<durations.length;i++){
   const seconds=durations[i]; const previous=shots[shots.length-1]; const prompt=[scene.title,scene.visual,scene.voice,music?`Synchronize visual rhythm to ${music.syncMode||"phrase"} timing.`:"","Maintain character, location, wardrobe, lighting and camera continuity with the previous shot."].filter(Boolean).join(". ");
   const nearest=(target:number)=>beats.length?beats.reduce((p,b)=>Math.abs(b-target)<Math.abs(p-target)?b:p,beats[0]):undefined;
   shots.push({id:`shot-${sequence+1}`,scene:Number(scene.number)||sequence+1,duration:seconds,prompt,provider,referenceShotId:previous?.id,extendFrom:previous?.id,beatStart:nearest(cursor),beatEnd:nearest(cursor+seconds)}); cursor+=seconds; sequence++;
  }
 }
 if(cursor!==durationSeconds){const delta=durationSeconds-cursor;const last=shots[shots.length-1];if(!last||last.duration+delta<3)throw new Error("Timeline shot tidak dapat diseimbangkan ke durasi final.");last.duration+=delta;cursor=durationSeconds;}
 log(logs,"shot-planning",`Storyboard dipecah menjadi ${shots.length} shot`,16,"Director membuat graph produksi multi-engine dengan durasi setiap shot sesuai batas engine");
 const all=["seedance-2.5","kling-3.0-omni","veo-3.1"] as LongFormProvider[]; all.forEach((provider,index)=>log(logs,"generation",providerReady(provider)?"Mesin visual siap":"Mesin visual tidak aktif pada job ini",20+index*3,"Salvian memilih hanya mesin yang benar-benar tersedia; detail mesin tetap internal",provider));
 if(!readyProviders().length)log(logs,"generation","Menunggu mesin visual","Belum ada engine video yang memiliki kredensial server aktif.",29);
 log(logs,"continuity","Menyiapkan reference frame dan continuity state",32,"Karakter, lokasi, kamera, wardrobe, lighting"); log(logs,"audio",music?"Menyiapkan sinkronisasi visual dengan lagu":"Menyiapkan voice-over dan ambience",38); log(logs,"assembly","Menyiapkan timeline master",48,"Semua shot akan dirakit menjadi satu video final"); return {durationSeconds,shots,music,logs};
}
export function missingProviderConfiguration(plan:LongFormPlan){return (["seedance-2.5","kling-3.0-omni","veo-3.1"] as LongFormProvider[]).filter(p=>!providerReady(p));}
export function providerEndpoint(provider:LongFormProvider){if(provider==="seedance-2.5")return process.env.SEEDANCE_API_URL||"https://ark.cn-beijing.volces.com/api/v3";if(provider==="kling-3.0-omni")return process.env.KLING_API_URL||"https://api-singapore.klingai.com";return process.env.VEO_API_URL||"https://us-central1-aiplatform.googleapis.com/v1";}
