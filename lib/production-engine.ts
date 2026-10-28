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

export type ProductionResult = { mode: "ai"|"local-director"; project: Record<string, any> };
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
  const seenTitles=new Set<string>();
  for(let i=0;i<scenes.length;i++){
    const title=String(scenes[i]?.title||"").trim().toLowerCase();
    if(title&&seenTitles.has(title))return true;
    if(title)seenTitles.add(title);
    if(i===0)continue;
    const prev=scenes[i-1],current=scenes[i];
    const prevVisual=String(prev?.visual||"").trim();
    const currentVisual=String(current?.visual||"").trim();
    const prevVoice=String(prev?.voice||"").trim();
    const currentVoice=String(current?.voice||"").trim();
    const exactVisual=prevVisual&&currentVisual&&prevVisual===currentVisual;
    const exactVoice=prevVoice&&currentVoice&&prevVoice===currentVoice;
    const semanticVisualOverlap=overlap(prevVisual,currentVisual);
    const semanticVoiceOverlap=overlap(prevVoice,currentVoice);
    if(exactVisual||exactVoice||(semanticVisualOverlap>=0.93&&semanticVoiceOverlap>=0.78))repeated++;
  }
  return repeated>=2;
}

function narrativeRepairPrompt(request:ProductionRequest,scenes:any[]){
  return `Anda adalah editor cerita Salvian. Perbaiki storyboard berikut agar menjadi video ${Math.round(request.duration*60)} detik yang benar-benar berkembang, bukan pengulangan prompt.
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
TARGET DURASI: ${Math.round(request.duration*60)} detik
GAYA: ${request.style}; RASIO: ${request.ratio}; BAHASA: ${request.language}; VOICE: ${request.voice}; MUSIK: ${request.music}.
Buat paket produksi lengkap untuk satu film utuh. WAJIB menghasilkan tepat ${count} scene yang berbeda dan progresif.
Jangan memperpanjang durasi dengan mengulang cerita. Durasi panjang harus dicapai dengan menambah peristiwa baru, sebab-akibat, konflik, keputusan, perubahan lokasi/waktu, konsekuensi, dan payoff.
Gunakan arc: opening -> setup -> inciting incident -> escalation -> complication -> midpoint -> reversal -> crisis -> climax -> aftermath -> resolution. Sesuaikan jumlah scene dengan alur agar tidak mekanis.
Setiap scene wajib memiliki number, title unik, visual, duration, dan voice. Visual harus berisi kejadian spesifik yang hanya terjadi pada scene itu, termasuk subjek, aksi, lokasi, waktu, kamera, dan perubahan keadaan. Voice harus memajukan cerita, bukan mengulang prompt.
Antar-scene harus tersambung secara sebab-akibat. Scene berikutnya harus dimulai dari keadaan yang dihasilkan scene sebelumnya.
Jaga identitas karakter, kostum, lokasi, properti, pencahayaan, dan arah gerak tetap konsisten kecuali cerita memang mengubahnya.
Untuk mode lagu, jadikan perubahan bagian lagu sebagai pemicu perubahan visual dan pacing. Untuk mode foto, gunakan foto sebagai anchor dan buat kejadian baru di sekitarnya.
Buat juga hook, script panjang, subtitles, voice, audio, visual, timeline, dan seo.
Durasi semua scene harus total tepat ${Math.round(request.duration*60)} detik.
Jangan gunakan markdown. Output JSON valid saja.`;
}

function normalizeLongFormProject(value:unknown,request:ProductionRequest){
  const input=value&&typeof value==="object"?value as Record<string,any>:{};
  const sourceScenes=Array.isArray(input.scenes)&&input.scenes.length?input.scenes.filter(Boolean):[];
  if(!sourceScenes.length)throw new Error("AI Director tidak menghasilkan storyboard scene.");
  const targetSeconds=Math.round(request.duration*60);
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

function buildLocalDirectorProject(request:ProductionRequest){
  const count=sceneCount(request.duration);
  const seed=(request.sourcePrompt||request.topic||"cerita pengguna").trim();
  const arc=[
    ["Pembukaan","Establishing shot sinematik memperlihatkan dunia cerita dan suasana sebelum konflik dimulai."],
    ["Tokoh Utama","Perkenalkan tokoh utama melalui aksi nyata, ekspresi, kostum, dan lingkungan yang konsisten."],
    ["Pemicu","Sebuah kejadian tak terduga mengubah keadaan dan memaksa tokoh utama bertindak."],
    ["Reaksi","Tokoh utama merespons pemicu, mengambil keputusan, lalu bergerak menuju sumber masalah."],
    ["Pertemuan","Tokoh utama berhadapan dengan pihak atau rintangan pertama; kamera mengikuti aksi secara dinamis."],
    ["Eskalasi","Konflik membesar, lingkungan ikut berubah, dan gerakan kamera menunjukkan tekanan yang meningkat."],
    ["Komplikasi","Masalah baru muncul dari keputusan sebelumnya dan membuat tujuan tokoh utama semakin sulit."],
    ["Titik Balik","Tokoh utama menemukan peluang atau informasi penting yang mengubah arah cerita."],
    ["Krisis","Situasi mencapai titik paling berbahaya; tokoh utama menghadapi konsekuensi terbesar."],
    ["Klimaks","Konfrontasi utama terjadi dengan aksi fisik dan perubahan keadaan yang jelas sampai konflik mencapai puncak."],
    ["Dampak","Debu dan ketegangan mereda; akibat dari klimaks terlihat pada karakter dan lingkungan."],
    ["Penutup","Cerita ditutup dengan keadaan baru yang merupakan hasil langsung dari seluruh kejadian sebelumnya."]
  ];
  const stages=Array.from({length:count},(_,i)=>arc[i%arc.length]);
  const scenes=stages.map(([title,action],i)=>({number:i+1,title:`${title} ${i+1}`,visual:`${action} Cerita sumber: ${seed}. Jangan mengulang shot sebelumnya; lanjutkan keadaan dari scene ${Math.max(1,i)} dan buat perubahan baru yang terlihat. Gaya ${request.style}, rasio ${request.ratio}, bahasa visual natural, pencahayaan konsisten, gerakan kamera sinematik, karakter dan properti konsisten.`,voice:`${title}: keadaan cerita berkembang sebagai akibat langsung dari kejadian sebelumnya.`,duration:1}));
  const project=normalizeLongFormProject({title:request.topic,scenes,subtitles:scenes.map((s:any)=>({start:s.number-1,end:s.number,text:s.voice}))},request);
  project.productionLogs=[{at:new Date().toISOString(),stage:"director",label:"Salvian Director menyusun film secara lokal",detail:`OpenAI tidak tersedia saat ini; alur produksi tetap berjalan dengan ${scenes.length} scene terstruktur.`,progress:12},{at:new Date().toISOString(),stage:"storyboard",label:`Storyboard ${scenes.length} scene siap`,detail:"Scene dibangun progresif dari opening sampai resolution tanpa mengulang satu prompt menjadi seluruh film.",progress:32},...(project.productionLogs||[])];
  return project;
}

async function providerError(response:Response){
  let detail="";
  try{const body=await response.json();detail=String(body?.error?.message||body?.error?.code||body?.message||"");}catch{try{detail=(await response.text()).slice(0,500);}catch{}}
  const error:any=new Error(`AI Story Director gagal (${response.status}).${detail?` ${detail}`:" Periksa model OPENAI_MODEL dan OPENAI_API_KEY di Vercel."}`);error.status=response.status;return error;
}

async function callOpenAI(apiKey:string,model:string,input:string){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),90000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,input,max_output_tokens:16000}),signal:controller.signal});
    if(!response.ok)throw await providerError(response);
    const data=await response.json();
    const raw=String(data.output_text||"").trim();
    if(!raw)throw new Error("AI Story Director tidak mengembalikan isi storyboard.");
    return raw;
  }catch(error){
    if(error instanceof Error&&error.name==="AbortError")throw new Error("AI Story Director timeout setelah 90 detik.");
    throw error;
  }finally{clearTimeout(timeout);}
}

function parseJson(raw:string){
  const cleaned=raw.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();
  try{return JSON.parse(cleaned);}catch{const first=cleaned.indexOf("{");const last=cleaned.lastIndexOf("}");if(first>=0&&last>first){try{return JSON.parse(cleaned.slice(first,last+1));}catch{}}throw new Error("AI Story Director mengembalikan format storyboard yang tidak valid.");}
}

class OpenAIProductionEngine implements ProductionEngine {
  async generate(request:ProductionRequest):Promise<ProductionResult>{
    const apiKey=process.env.OPENAI_API_KEY?.trim();
    if(!apiKey){return {mode:"local-director",project:{...buildLocalDirectorProject(request),status:"Script & scene siap — mode Director lokal"}};}
    const model=process.env.OPENAI_MODEL||"gpt-6-luna";
    try{
      const raw=await callOpenAI(apiKey,model,buildPrompt(request));
      const project=parseJson(raw);
      try{return {mode:"ai",project:{...normalizeLongFormProject(project,request),status:"Script & scene siap"}};}catch(error){
        if(!(error instanceof Error)||!error.message.includes("terlalu berulang"))throw error;
        const repaired=parseJson(await callOpenAI(apiKey,model,narrativeRepairPrompt(request,(project as any)?.scenes||[])));
        return {mode:"ai",project:{...normalizeLongFormProject({...project,scenes:repaired},request),status:"Script & scene siap"}};
      }
    }catch(error:any){
      const status=Number(error?.status||0);const message=String(error?.message||"").toLowerCase();
      if(status===429||/billing|account is not active|insufficient.?quota|credit.?balance|spend limit/.test(message)){
        console.warn("SALVIAN DIRECTOR: OpenAI unavailable; continuing with local production planner.");
        return {mode:"local-director",project:{...buildLocalDirectorProject(request),status:"Script & scene siap — mode Director lokal"}};
      }
      throw error;
    }
  }
}

export const productionEngine:ProductionEngine=new OpenAIProductionEngine();