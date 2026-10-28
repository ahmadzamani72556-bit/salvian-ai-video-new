import { NextResponse } from "next/server";
import { productionEngine } from "../../../lib/production-engine";

const durations=[0.25,0.5,1],styles=["Cinematic","Documentary","Realistic","Anime","Islamic Elegant"],ratios=["16:9","9:16","1:1"],languages=["Indonesia","English","Malay"],voices=["Narator Natural","Narator Deep","Narator Warm","Storytelling"],musicOptions=["Ambient Cinematic","Emotional Piano","Documentary","Minimal","Tanpa Musik"];
function oneOf(value:unknown,allowed:string[],fallback:string,label:string){if(value===undefined||value===null||value==="")return fallback;if(typeof value!=="string"||!allowed.includes(value))throw new Error(`${label} tidak valid.`);return value;}
function fallbackProject(request:{topic:string;duration:number;style:string;ratio:string;language:string;voice:string;sourceType:string;sourcePrompt:string;sourceAssets:any[];musicAsset?:any}){
  const count=request.duration===0.25?3:request.duration===0.5?4:6;
  const target=Math.round(request.duration*60);
  const base=Math.floor(target/count),extra=target-base*count;
  const arc=[
    ["Pembukaan","Establishing shot memperlihatkan lingkungan utama dan suasana awal cerita."],
    ["Pengenalan","Tokoh utama diperlihatkan melakukan tindakan nyata dengan identitas visual yang konsisten."],
    ["Pemicu","Peristiwa baru mengubah keadaan dan memberi tokoh utama tujuan yang jelas."],
    ["Keputusan","Tokoh utama mengambil keputusan sebagai akibat langsung dari pemicu sebelumnya."],
    ["Perjalanan","Tokoh utama bergerak menuju tujuan melalui lingkungan yang berubah secara nyata."],
    ["Rintangan","Hambatan pertama muncul dan memaksa tokoh utama mengubah rencana."],
    ["Eskalasi","Konflik meningkat; aksi dan lingkungan berubah sebagai akibat keputusan sebelumnya."],
    ["Komplikasi","Masalah baru muncul dan mempersempit pilihan tokoh utama."],
    ["Titik Balik","Informasi atau kejadian penting mengubah arah cerita."],
    ["Krisis","Tujuan utama terancam dan tokoh utama menghadapi konsekuensi terbesar."],
    ["Konfrontasi","Tokoh utama menghadapi sumber konflik secara langsung."],
    ["Klimaks","Konflik mencapai puncak melalui rangkaian aksi yang jelas dan berubah dari shot ke shot."],
    ["Akibat","Dampak klimaks terlihat pada tokoh, lingkungan, dan keadaan cerita."],
    ["Pemulihan","Tokoh utama menghadapi keadaan baru yang tercipta dari konflik."],
    ["Penyelesaian","Tujuan cerita memperoleh jawaban dan hubungan sebab-akibat diselesaikan."],
    ["Penutup","Film berakhir pada keadaan baru yang menjadi hasil langsung seluruh perjalanan."]
  ];
  let cursor=0;
  const scenes=Array.from({length:count},(_,i)=>{
    const duration=base+(i<extra?1:0);
    const [title,action]=arc[i%arc.length];
    const visual=`${action} Sumber cerita: ${request.sourcePrompt}. Scene ini wajib melanjutkan keadaan scene sebelumnya dan menambahkan kejadian baru yang terlihat. Pertahankan karakter, kostum, properti, lokasi, pencahayaan, dan arah gerak secara konsisten. Jangan mengulang aksi scene sebelumnya. Gaya ${request.style}, rasio ${request.ratio}, sinematik realistis, kamera bergerak natural.`;
    const voice=`${title}: ${action} Cerita terus berkembang dari kejadian sebelumnya dan menghasilkan perubahan untuk scene berikutnya.`;
    const scene={number:i+1,title:`${title} ${i+1}`,visual,voice,duration,start:cursor,end:cursor+duration};
    cursor+=duration;return scene;
  });
  return {title:request.topic,duration:request.duration,durationSeconds:target,sourceType:request.sourceType,sourcePrompt:request.sourcePrompt,sourceAssets:request.sourceAssets,musicAsset:request.musicAsset,scenes,subtitles:scenes.map((s:any)=>({start:s.start,end:s.end,text:s.voice})),voice:{status:request.sourceType==="song"?"not-required":"ready",style:request.voice,language:request.language},audio:{voice:request.voice,music:request.sourceType==="song"?"Lagu sumber":"Ambient Cinematic",language:request.language,durationSeconds:target,sourceMode:request.sourceType},visual:{style:request.style,ratio:request.ratio,sourceMode:request.sourceType},timeline:{pacing:"Smart",durationSeconds:target,sourceMode:request.sourceType},render:{status:"queued",format:"MP4",resolution:"1080p",durationSeconds:target},productionLogs:[{at:new Date().toISOString(),stage:"director",label:"Salvian Director menyiapkan alur produksi",detail:"Penyusunan AI utama tidak menghalangi produksi. Salvian menggunakan planner cadangan agar proses video tetap berjalan.",progress:12},{at:new Date().toISOString(),stage:"storyboard",label:`Storyboard ${count} scene siap`,detail:"Setiap scene memiliki kejadian berbeda dan hubungan sebab-akibat.",progress:32}],seo:{title:request.topic,description:`Video ${request.sourceType} tentang ${request.topic}.`,tags:[request.topic,request.language,"SALVIAN AI VIDEO"]}};
}

export async function POST(request:Request){
  try{
    const body=await request.json();
    const sourceType=oneOf(body.sourceType,["text","song","photo"],"text","Jenis sumber") as "text"|"song"|"photo";
    const topic=typeof body.topic==="string"?body.topic.trim():"";
    const sourcePrompt=typeof body.sourcePrompt==="string"?body.sourcePrompt.trim():topic;
    const duration=Number(body.duration);
    if(!sourcePrompt&&!topic)return NextResponse.json({error:"Isi alur atau perintah terlebih dahulu."},{status:400});
    if(!durations.includes(duration))return NextResponse.json({error:"Durasi tidak valid."},{status:400});
    const style=oneOf(body.style,styles,"Cinematic","Gaya visual"),ratio=oneOf(body.ratio,ratios,"16:9","Rasio"),language=oneOf(body.language,languages,"Indonesia","Bahasa"),voice=oneOf(body.voice,voices,"Narator Natural","Voice-over"),music=oneOf(body.music,musicOptions,"Ambient Cinematic","Musik");
    const requestData={topic:topic||sourcePrompt,duration,style,ratio,language,voice,music,autoStoryboard:body.autoStoryboard!==false,autoSubtitle:body.autoSubtitle!==false,smartPacing:body.smartPacing!==false,sourceType,sourcePrompt,sourceAssets:Array.isArray(body.sourceAssets)?body.sourceAssets:[],musicAsset:body.musicAsset&&typeof body.musicAsset==="object"?body.musicAsset:undefined};
    try{
      const result=await productionEngine.generate(requestData);
      return NextResponse.json({ok:true,mode:result.mode,project:result.project});
    }catch(error){
      console.warn("SALVIAN DIRECTOR: primary planner failed; switching to deterministic production planner.",error instanceof Error?error.message:"unknown error");
      return NextResponse.json({ok:true,mode:"local-director",project:{...fallbackProject(requestData),status:"Script & scene siap"}});
    }
  }catch(error){
    const message=error instanceof Error?error.message:"Permintaan tidak dapat diproses.";
    const status=message.endsWith("tidak valid.")?400:500;
    return NextResponse.json({error:message},{status});
  }
}
