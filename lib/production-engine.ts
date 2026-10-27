import type { SourceAsset, SourceType } from "./project-store";

export type ProductionRequest = {
  topic: string;
  duration: number;
  style: string;
  ratio: string;
  language: string;
  voice: string;
  music: string;
  autoStoryboard: boolean;
  autoSubtitle: boolean;
  smartPacing: boolean;
  sourceType?: SourceType;
  sourcePrompt?: string;
  sourceAssets?: SourceAsset[];
  musicAsset?: { name:string; durationSeconds?:number; mimeType?:string; syncMode?:string };
};

export type ProductionResult = { mode: "ai"; project: Record<string, any> };
export interface ProductionEngine { generate(request: ProductionRequest): Promise<ProductionResult>; }

function exactSceneDurations(source:any[], targetSeconds:number){
  const safe=source.length?source:[{duration:targetSeconds}];
  const weights=safe.map(s=>{const v=Number(s?.duration);return Number.isFinite(v)&&v>0?v:1});
  const total=weights.reduce((a,b)=>a+b,0);
  const out:number[]=[];let allocated=0;
  for(let i=0;i<safe.length;i+=1){
    if(i===safe.length-1){out.push(Math.max(1,targetSeconds-allocated));break;}
    const remaining=safe.length-i-1;
    const proportional=Math.round(targetSeconds*weights[i]/total);
    const maxAllowed=Math.max(1,targetSeconds-allocated-remaining);
    const next=Math.min(maxAllowed,Math.max(1,proportional));
    out.push(next);allocated+=next;
  }
  return out;
}

function normalizeSubtitles(input:unknown,scenes:any[],targetSeconds:number){
  if(!Array.isArray(input)||!input.length)return scenes.map(s=>({start:s.start,end:s.end,text:s.title}));
  const raw=input.filter(Boolean);
  const maxEnd=Math.max(...raw.map((x:any)=>Number(x?.end)||0),0);
  if(!maxEnd)return scenes.map(s=>({start:s.start,end:s.end,text:s.title}));
  const scale=targetSeconds/maxEnd;
  return raw.map((x:any,i:number)=>{
    const start=Math.max(0,Math.round((Number(x?.start)||0)*scale));
    const end=Math.min(targetSeconds,Math.max(start+1,Math.round((Number(x?.end)||0)*scale)));
    return {start,end,text:String(x?.text||scenes[i%scenes.length]?.title||"")};
  });
}

function sourceDescription(request:ProductionRequest){
  if(request.sourceType==="song")return `Sumber utama: LAGU SELESAI. Nama file: ${request.musicAsset?.name||"lagu pengguna"}. Durasi audio: ${request.musicAsset?.durationSeconds||request.duration*60} detik. Sinkronisasi: ${request.musicAsset?.syncMode||"phrase"}. Visual harus mengikuti struktur lagu, intro, verse, chorus, bridge, perubahan energi, dan ending. Jangan mengganti lagu sumber.`;
  if(request.sourceType==="photo")return `Sumber utama: FOTO REFERENSI. Asset: ${(request.sourceAssets||[]).map(a=>a.name).join(", ")||"foto pengguna"}. Gunakan foto sebagai anchor identitas, lokasi, karakter, warna, kostum, dan komposisi. Kembangkan kejadian baru di sekeliling foto, bukan mengulang deskripsi foto.`;
  return `Sumber utama: TULISAN. Kembangkan ide pengguna menjadi cerita audiovisual utuh dengan perkembangan sebab-akibat yang nyata.`;
}

function sceneCount(duration:number){
  if(duration===5)return 12;
  if(duration===6)return 14;
  if(duration===7)return 16;
  return 18;
}

function normalizedWords(value:unknown){
  return String(value||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>3);
}

function overlap(a:unknown,b:unknown){
  const aa=new Set(normalizedWords(a)),bb=new Set(normalizedWords(b));
  if(!aa.size||!bb.size)return 0;
  let common=0;for(const w of aa)if(bb.has(w))common++;
  return common/Math.max(aa.size,bb.size);
}

function hasNarrativeRepetition(scenes:any[]){
  if(scenes.length<2)return false;
  let repeated=0;
  for(let i=1;i<scenes.length;i++){
    const a=[scenes[i-1]?.title,scenes[i-1]?.visual,scenes[i-1]?.voice].join(" ");
    const b=[scenes[i]?.title,scenes[i]?.visual,scenes[i]?.voice].join(" ");
    if(overlap(a,b)>=0.72)repeated++;
  }
  const uniqueTitles=new Set(scenes.map(s=>String(s?.title||"").trim().toLowerCase()).filter(Boolean)).size;
  return repeated>=2||uniqueTitles<Math.max(3,Math.ceil(scenes.length*0.7));
}

function narrativeRepairPrompt(request:ProductionRequest,scenes:any[]){
  return `Anda adalah editor cerita Salvian. Perbaiki storyboard berikut agar menjadi film ${request.duration} menit yang benar-benar berkembang, bukan pengulangan prompt.
TOPIK: ${request.sourcePrompt||request.topic}
STORYBOARD SAAT INI:
${JSON.stringify(scenes)}
Aturan keras:
- Pertahankan jumlah scene ${scenes.length}.
- Setiap scene harus punya tujuan naratif berbeda.
- Tidak boleh ada dua scene berurutan dengan kejadian/visual yang sama.
- Setiap scene harus menyebabkan perubahan yang memengaruhi scene berikutnya.
- Gunakan struktur pembukaan, pemicu masalah, eskalasi, komplikasi, titik balik, konsekuensi, klimaks, dan penutup.
- Jangan menyalin ulang topik pengguna sebagai visual setiap scene.
- Berikan aksi konkret, lokasi/waktu, subjek, kamera, emosi, dan perubahan keadaan.
- Output JSON array scene saja dengan number,title,visual,duration,voice.`;
}

function buildPrompt(request:ProductionRequest){
  const count=sceneCount(request.duration);
  return `Anda adalah SALVIAN DIRECTOR, sutradara AI untuk produksi video long-form. ${sourceDescription(request)}
TOPIK/ALUR PENGGUNA: ${request.sourcePrompt||request.topic}
TARGET DURASI: ${request.duration} menit (${request.duration*60} detik)
GAYA: ${request.style}; RASIO: ${request.ratio}; BAHASA: ${request.language}; VOICE: ${request.voice}; MUSIK: ${request.music}.
Buat paket produksi lengkap untuk satu film utuh. WAJIB menghasilkan tepat ${count} scene yang berbeda dan progresif.
Jangan memperpanjang durasi dengan mengulang cerita. Durasi panjang harus dicapai dengan menambah peristiwa baru, sebab-akibat, konflik, keputusan, perubahan lokasi/waktu, konsekuensi, dan payoff.
Gunakan arc: opening -> setup -> inciting incident -> escalation -> complication -> midpoint -> reversal -> crisis -> climax -> aftermath -> resolution. Sesuaikan jumlah scene dengan alur agar tidak mekanis.
Setiap scene wajib memiliki number, title unik, visual, duration, dan voice. Visual harus berisi kejadian spesifik yang hanya terjadi pada scene itu, termasuk subjek, aksi, lokasi, waktu, kamera, dan perubahan keadaan. Voice harus memajukan cerita, bukan mengulang prompt.
Antar-scene harus tersambung secara sebab-akibat. Scene berikutnya harus dimulai dari keadaan yang dihasilkan scene sebelumnya.
Jaga identitas karakter, kostum, lokasi, properti, pencahayaan, dan arah gerak tetap konsisten kecuali cerita memang mengubahnya.
Untuk mode lagu, jadikan perubahan bagian lagu sebagai pemicu perubahan visual dan pacing. Untuk mode foto, gunakan foto sebagai anchor dan buat kejadian baru di sekitarnya.
Buat juga hook, script panjang, subtitles, voice, audio, visual, timeline, dan seo.
Durasi semua scene harus total tepat ${request.duration*60} detik.
Jangan gunakan markdown. Output JSON valid saja.`;
}

function normalizeLongFormProject(value:unknown,request:ProductionRequest){
  const input=value&&typeof value==="object"?value as Record<string,any>:{};
  const sourceScenes=Array.isArray(input.scenes)&&input.scenes.length?input.scenes.filter(Boolean):[];
  if(!sourceScenes.length)throw new Error("AI Director tidak menghasilkan storyboard scene.");
  const targetSeconds=request.duration*60;
  const durations=exactSceneDurations(sourceScenes,targetSeconds);
  let cursor=0;
  const scenes=sourceScenes.map((scene:any,index:number)=>{
    const duration=durations[index];
    const normalized={number:index+1,title:String(scene?.title||`Scene ${index+1}`),visual:String(scene?.visual||""),duration,start:cursor,end:cursor+duration,voice:String(scene?.voice||"")};
    cursor+=duration;return normalized;
  });
  if(hasNarrativeRepetition(scenes))throw new Error("AI Director menghasilkan storyboard yang terlalu berulang. Produksi dihentikan agar tidak membuat video panjang dengan alur yang sama.");
  const subtitles=request.autoSubtitle?normalizeSubtitles(input.subtitles,scenes,targetSeconds):[];
  return {...input,title:String(input.title||request.topic),duration:request.duration,durationSeconds:targetSeconds,sourceType:request.sourceType||"text",sourcePrompt:request.sourcePrompt,sourceAssets:request.sourceAssets||[],musicAsset:request.musicAsset,scenes,subtitles,voice:input.voice&&typeof input.voice==="object"?input.voice:{status:request.sourceType==="song"?"not-required":"ready",style:request.voice,language:request.language},audio:input.audio&&typeof input.audio==="object"?{...input.audio,durationSeconds:targetSeconds}:{voice:request.voice,music:request.music,language:request.language,durationSeconds:targetSeconds,sourceMode:request.sourceType||"text"},visual:input.visual&&typeof input.visual==="object"?input.visual:{style:request.style,ratio:request.ratio,sourceMode:request.sourceType||"text"},timeline:input.timeline&&typeof input.timeline==="object"?{...input.timeline,pacing:request.smartPacing?"Smart":"Manual",durationSeconds:targetSeconds,sourceMode:request.sourceType||"text"}:{pacing:request.smartPacing?"Smart":"Manual",durationSeconds:targetSeconds,sourceMode:request.sourceType||"text"},render:{status:"queued",format:"MP4",resolution:"1080p",durationSeconds:targetSeconds},productionLogs:[{at:new Date().toISOString(),stage:"director",label:"Menyusun film utuh",detail:`AI Director membangun ${scenes.length} scene yang saling berkembang.`,progress:12},{at:new Date().toISOString(),stage:"storyboard",label:`Storyboard ${scenes.length} scene selesai`,detail:"Setiap scene memiliki tujuan dan kejadian berbeda.",progress:32},{at:new Date().toISOString(),stage:"continuity",label:"Menyiapkan reference frame dan continuity state",detail:"Identitas karakter, lokasi, wardrobe, lighting, dan state antar-scene dikunci.",progress:52},{at:new Date().toISOString(),stage:"timeline",label:"Menyiapkan timeline master",detail:"Durasi seluruh scene sudah diseimbangkan ke target final.",progress:72}],seo:input.seo||{title:request.topic,description:`Video ${request.sourceType||"text"} tentang ${request.topic}.`,tags:[request.topic,request.language,"SALVIAN AI VIDEO"]}};
}

class OpenAIProductionEngine implements ProductionEngine {
  async generate(request:ProductionRequest):Promise<ProductionResult>{
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey)throw new Error("AI Story Director belum dikonfigurasi. Masukkan OPENAI_API_KEY di server sebelum membuat storyboard produksi.");
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5-mini",input:buildPrompt(request)})});
    if(!response.ok)throw new Error("Layanan AI Story Director sedang tidak tersedia.");
    const data=await response.json();const raw=data.output_text||"";let project:unknown;
    try{project=JSON.parse(raw);}catch{throw new Error("AI Story Director mengembalikan format storyboard yang tidak valid.");}
    try{return {mode:"ai",project:{...normalizeLongFormProject(project,request),status:"Script & scene siap"}};}catch(error){
      if(!(error instanceof Error)||!error.message.includes("terlalu berulang"))throw error;
      const repair=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5-mini",input:narrativeRepairPrompt(request,(project as any)?.scenes||[])})});
      if(!repair.ok)throw new Error("AI Story Director gagal memperbaiki storyboard yang berulang.");
      const repairData=await repair.json();let repaired:unknown;try{repaired=JSON.parse(repairData.output_text||"");}catch{throw new Error("AI Story Director mengembalikan storyboard perbaikan yang tidak valid.");}
      return {mode:"ai",project:{...normalizeLongFormProject({...project,scenes:repaired},request),status:"Script & scene siap"}};
    }
  }
}

export const productionEngine:ProductionEngine=new OpenAIProductionEngine();
