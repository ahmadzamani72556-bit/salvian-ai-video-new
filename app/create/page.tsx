"use client";

import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Film, Image as ImageIcon, Loader2, Music2, Upload, X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createProjectId, readActiveProject, readProject, saveActiveProject, type SourceAsset, type SourceType, type VideoProject } from "../../lib/project-store";

const durations=[0.25,0.5,1];
const modes:{id:SourceType;title:string;description:string;icon:any}[]=[
  {id:"song",title:"Lagu → Video Musik",description:"Unggah lagu penuh dan foto pemeran. Video mengikuti durasi lagu dan menggunakan foto yang kamu tambahkan.",icon:Music2},
];

type UploadedAsset=SourceAsset & {url?:string};
const directorStages=[
  {id:"received",label:"Sumber diterima",detail:"Cerita, lagu, atau foto sudah masuk ke produksi."},
  {id:"director",label:"Salvian Director",detail:"Menyusun alur, scene, karakter, dan storyboard."},
  {id:"validate",label:"Validasi storyboard",detail:"Memeriksa durasi, continuity, dan urutan kejadian."},
  {id:"render",label:"Produksi dimulai",detail:"Storyboard dikirim ke ruang produksi untuk membuat shot."},
];

export default function CreatePage(){
 const router=useRouter();
 const [mode,setMode]=useState<SourceType>("song");
 const [prompt,setPrompt]=useState("");
 const [duration,setDuration]=useState(0.5);
 const [style,setStyle]=useState("Cinematic");
 const [ratio,setRatio]=useState("16:9");
 const [language,setLanguage]=useState("Indonesia");
 const [voice,setVoice]=useState("Narator Natural");
 const [loading,setLoading]=useState(false);
 const [generating,setGenerating]=useState(false);
 const [message,setMessage]=useState("");
 const [title,setTitle]=useState("");
 const [projectId,setProjectId]=useState("");
 const [assets,setAssets]=useState<UploadedAsset[]>([]);
 const [previews,setPreviews]=useState<string[]>([]);
 const [audioDuration,setAudioDuration]=useState(0);
 const [directorStage,setDirectorStage]=useState("received");
 const [startedAt,setStartedAt]=useState<number|null>(null);
 const [clock,setClock]=useState(Date.now());
 const modeInfo=modes.find(m=>m.id===mode)!;

 useEffect(()=>{
   const p=new URLSearchParams(location.search);
   const requestedId=p.get("projectId")||undefined;
   const requestedTitle=p.get("project")||undefined;
   const requestedMode=p.get("mode") as SourceType|null;
   const existing=readProject(requestedId,requestedTitle)||readActiveProject();
   setMode("song");
   if(existing){
     setProjectId(existing.id);setTitle(existing.title);setMode("song");
     setPrompt(existing.sourcePrompt||existing.topic||"");setDuration(Number(existing.musicAsset?.durationSeconds||existing.durationSeconds||existing.duration||0)/60||0.5);setStyle(existing.style||"Cinematic");
     setRatio(existing.ratio||"16:9");setLanguage(existing.language||"Indonesia");setVoice(existing.voice||"Narator Natural");
     setAssets([...(existing.sourceAssets||[]) as UploadedAsset[],...(existing.musicAsset?[existing.musicAsset as UploadedAsset]:[])]);
   }
 },[]);
 useEffect(()=>{if(!generating)return;const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer);},[generating]);

 const elapsed=startedAt?Math.max(0,Math.floor((clock-startedAt)/1000)):0;
 const elapsedLabel=`${String(Math.floor(elapsed/60)).padStart(2,"0")}:${String(elapsed%60).padStart(2,"0")}`;
 const canGenerate=assets.some(a=>a.url&&a.mimeType?.startsWith("audio/"))&&assets.some(a=>a.url&&a.mimeType?.startsWith("image/"))&&!loading;
 const workspaceHref=projectId?`/create?project=${encodeURIComponent(title)}&projectId=${encodeURIComponent(projectId)}`:"/create";
 const assistantHref=projectId?`/workspace?assistant=1&project=${encodeURIComponent(title)}&projectId=${encodeURIComponent(projectId)}`:"/workspace?assistant=1";
 const placeholder="Opsional: jelaskan suasana atau gerakan kamera. Foto yang diunggah menjadi pemeran visual.";
 const sourceLabel="ARAHAN VISUAL (OPSIONAL)";

 async function handleFiles(list:FileList|null){
   if(!list)return;const files=Array.from(list);if(!files.length)return;setLoading(true);setMessage("Mengunggah file ke penyimpanan produksi…");
   const next:UploadedAsset[]=[];const nextPreviews:string[]=[];
   try{
     for(const f of files){
       let seconds=0;
       if(f.type.startsWith("audio/")){
         try{const localUrl=URL.createObjectURL(f);const audio=document.createElement("audio");audio.src=localUrl;await new Promise<void>(resolve=>{audio.onloadedmetadata=()=>{seconds=Number.isFinite(audio.duration)?audio.duration:0;resolve();};audio.onerror=()=>resolve();});URL.revokeObjectURL(localUrl);}catch{}
       }
       const blob=await upload(`salvian/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`,f,{access:"public",handleUploadUrl:`${window.location.origin}/api/assets/upload`});
       next.push({name:f.name,mimeType:f.type,size:f.size,durationSeconds:seconds||undefined,url:blob.url});
       if(f.type.startsWith("image/"))nextPreviews.push(blob.url);
     }
     setAssets(v=>[...v.filter(old=>{const replacingAudio=next.some(n=>n.mimeType?.startsWith("audio/"))&&old.mimeType?.startsWith("audio/");const duplicateImage=next.some(n=>n.mimeType?.startsWith("image/")&&old.name===n.name);return !replacingAudio&&!duplicateImage;}),...next]);setPreviews(v=>[...v,...nextPreviews]);const audio=next.find(a=>a.mimeType?.startsWith("audio/"));if(audio?.durationSeconds){setAudioDuration(audio.durationSeconds);setDuration(audio.durationSeconds/60);}
     setMessage(`${next.length} sumber siap digunakan Salvian Director.`);
   }catch(e){setMessage(e instanceof Error&&e.message.includes("Failed to retrieve the client token")?"Server gagal menyiapkan token upload. Coba lagi setelah deployment terbaru aktif; detail penyebab dicatat aman di log server.":e instanceof Error?e.message:"Upload sumber gagal.");}finally{setLoading(false);}
 }

 async function generate(){
   if(!canGenerate)return;
   setLoading(true);setGenerating(true);setStartedAt(Date.now());setClock(Date.now());setDirectorStage("received");
   setMessage(mode==="song"?"Sumber lagu diterima. Director akan membaca struktur audio terlebih dahulu.":mode==="photo"?"Foto dan alur diterima. Director mulai membaca reference visual.":"Cerita diterima. Director mulai menyusun film.");
   try{
     const nextId=projectId||createProjectId(title||prompt.slice(0,60)||"Video Musik");
     const audioFile=assets.find(a=>a.mimeType?.startsWith("audio/"));const photoAssets=assets.filter(a=>a.mimeType?.startsWith("image/"));const musicAsset=audioFile?{name:audioFile.name,url:audioFile.url,mimeType:audioFile.mimeType,durationSeconds:audioFile.durationSeconds,syncMode:"phrase"}:undefined;
     setDirectorStage("director");
     setMessage(mode==="song"?"Salvian Director sedang menganalisis struktur lagu dan menyusun visual per bagian…":mode==="photo"?"Salvian Director sedang membaca foto sebagai reference dan menyusun kejadian baru…":"Salvian Director sedang menyusun scene, alur sebab-akibat, dan storyboard…");
     const response=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceType:"song",topic:prompt||"Video musik menggunakan foto yang diunggah sebagai pemeran",sourcePrompt:prompt||"Buat video musik yang menggunakan foto-foto yang diunggah sebagai pemeran visual. Jangan menciptakan pemeran lain.",duration:musicAsset?.durationSeconds?musicAsset.durationSeconds/60:duration,style,ratio,language,voice,music:"Tanpa Musik",sourceAssets:photoAssets,musicAsset,autoStoryboard:true,autoSubtitle:false,smartPacing:true})});
     const data=await response.json();if(!response.ok)throw new Error(data?.error||"Gagal membuat project.");
     setDirectorStage("validate");setMessage("Storyboard diterima. Salvian memeriksa scene, durasi, continuity, audio, dan timeline…");
     const raw=data.project||{};
     const next:VideoProject={id:nextId,title:raw.title||title||prompt.slice(0,80)||"Video Musik",status:"Produksi",duration:musicAsset?.durationSeconds?musicAsset.durationSeconds/60:duration,sourceType:"song",sourcePrompt:prompt,sourceAssets:photoAssets,topic:prompt,style,ratio,language,voice,music:"Lagu sumber",musicAsset,script:raw.script,scenes:Array.isArray(raw.scenes)?raw.scenes:[],productionLogs:Array.isArray(raw.productionLogs)?raw.productionLogs:[],audio:raw.audio,visual:raw.visual,subtitle:raw.subtitle,timeline:raw.timeline,updatedAt:new Date().toISOString()};
     saveActiveProject(next);setProjectId(next.id);setTitle(next.title);setDirectorStage("render");setMessage("Storyboard tervalidasi. Membuka ruang produksi live sekarang.");
     router.push(`/render?project=${encodeURIComponent(next.title)}&projectId=${encodeURIComponent(next.id)}&from=studio`);
   }catch(e){setMessage(e instanceof Error?e.message:"Terjadi kesalahan saat menyiapkan project.");setLoading(false);setGenerating(false);}
 }

 return <main style={{minHeight:"100vh",background:"#fff",color:"#111827"}}>
  <header style={{height:64,borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px"}}>
   <Link href={workspaceHref} style={buttonStyle}><span style={markStyle}>S</span>SALVIAN AI VIDEO</Link>
   <div style={{display:"flex",gap:8}}><Link href={workspaceHref} style={buttonStyle}>Workspace</Link><Link href={assistantHref} style={buttonStyle}><Bot size={15}/> AI Assistant</Link></div>
  </header>
  <section style={{maxWidth:1000,margin:"0 auto",padding:"34px 20px 80px"}}>
   <Link href={workspaceHref} style={{color:"#6b7280",textDecoration:"none",display:"inline-flex",gap:6,alignItems:"center",fontSize:14}}><ArrowLeft size={15}/> Kembali</Link>
   <div style={{marginTop:24}}><div style={eyebrow}>SALVIAN · MUSIC VIDEO</div><h1 style={{fontSize:32,lineHeight:1.15,margin:"8px 0"}}>Klip musik dari foto pilihanmu.</h1><p style={{color:"#6b7280",maxWidth:680,margin:0}}>1. Unggah lagu. 2. Tambahkan foto pemeran. 3. Buat satu klip utuh mengikuti durasi lagu.</p></div>
   
   <div style={{marginTop:18,padding:18,border:"1px solid #e5e7eb",borderRadius:16,background:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}><div><div style={eyebrow}>{modeInfo.title}</div><h2 style={{margin:"6px 0 0",fontSize:21}}>{"Buat video musik dari lagu dan foto"}</h2></div><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#15803d"}}><CheckCircle2 size={15}/> Salvian Director</span></div>
    <details style={{marginTop:18}}><summary style={{cursor:"pointer",fontSize:13,fontWeight:700,color:"#475569"}}>Arahan visual tambahan (opsional)</summary><textarea disabled={loading} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={placeholder} rows={3} style={{...textareaStyle,marginTop:10}}/></details>
    {(mode==="song"||mode==="photo")&&<><label style={{...uploadBox,marginTop:16,background:"#f8fafc"}}><Music2 size={21}/><span><strong>Pilih lagu penuh</strong><small>MP3, WAV, atau M4A · satu lagu</small></span><input hidden type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac" onChange={e=>handleFiles(e.target.files)}/></label><label style={{...uploadBox,marginTop:10,background:"#fff"}}><ImageIcon size={21}/><span><strong>Tambahkan foto pemeran utama</strong><small>Satu atau beberapa foto · JPG, PNG, WEBP</small></span><input hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>handleFiles(e.target.files)}/></label></>}
    {assets.length>0&&<div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:8}}>{assets.map((a,i)=><div key={`${a.name}-${i}`} style={assetStyle}>{a.mimeType?.startsWith("audio/")?<Music2 size={14}/>:<ImageIcon size={14}/>}<span>{a.name}</span>{a.url&&<CheckCircle2 size={13} color="#16a34a"/>}<button type="button" disabled={loading} onClick={()=>setAssets(v=>v.filter((_,x)=>x!==i))} style={removeStyle}><X size={13}/></button></div>)}</div>}
    {audioDuration>0&&<div style={hintStyle}>Durasi lagu terdeteksi: <strong>{Math.floor(audioDuration/60)}:{String(Math.round(audioDuration%60)).padStart(2,"0")}</strong>. Timeline visual akan mengikuti struktur lagu.</div>}
    {previews.length>0&&<div style={{display:"flex",gap:8,marginTop:12,overflowX:"auto"}}>{previews.map(src=><img key={src} src={src} alt="Reference" style={{width:110,height:75,objectFit:"cover",borderRadius:10,border:"1px solid #e5e7eb"}}/>)}</div>}
    <div style={{marginTop:18,padding:12,borderRadius:10,background:"#f8fafc",fontSize:13,color:"#475569"}}><strong>Durasi otomatis</strong><div style={{marginTop:4}}>Klip final mengikuti seluruh durasi lagu yang diunggah.</div></div><div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginTop:14}}><Control label="FORMAT KLIP"><select disabled={loading} value={ratio} onChange={e=>setRatio(e.target.value)} style={inputStyle}><option value="16:9">Lanskap · 16:9</option><option value="9:16">Vertikal · 9:16</option><option value="1:1">Persegi · 1:1</option></select></Control></div>
    
    {message&&<div style={{marginTop:18,padding:13,borderRadius:10,background:"#f8fafc",border:"1px solid #e5e7eb",fontSize:13}}>{message}</div>}
    {generating&&<section style={{marginTop:18,padding:18,border:"1px solid #dbeafe",borderRadius:14,background:"#f8fafc"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><div style={eyebrow}>LIVE · PRODUKSI AWAL</div><h3 style={{margin:"5px 0 2px",fontSize:18}}>Salvian sedang bekerja</h3><p style={{margin:0,fontSize:13,color:"#64748b"}}>Setiap tahap nyata ditampilkan. Setelah storyboard selesai, layar Render melanjutkan monitor shot, continuity, audio, assembly, dan video final.</p></div><strong>{elapsedLabel}</strong></div><div style={{display:"grid",gap:8,marginTop:16}}>{directorStages.map((stage,index)=>{const current=directorStages.findIndex(s=>s.id===directorStage);const active=stage.id===directorStage;const done=current>index;return <div key={stage.id} style={{display:"grid",gridTemplateColumns:"30px 1fr auto",gap:10,alignItems:"center",padding:"11px 12px",border:"1px solid #e5e7eb",borderRadius:10,background:active?"#fff":"transparent"}}><span style={{width:30,height:30,borderRadius:99,display:"grid",placeItems:"center",background:done?"#dcfce7":active?"#111827":"#e5e7eb",color:done?"#166534":active?"#fff":"#64748b"}}>{active?<Loader2 size={15} className="spin"/>:done?<CheckCircle2 size={15}/>:<Film size={15}/>}</span><div><strong style={{fontSize:13}}>{stage.label}</strong><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{stage.detail}</div></div><b style={{fontSize:11,color:done?"#15803d":active?"#111827":"#94a3b8"}}>{done?"SELESAI":active?"AKTIF":"MENUNGGU"}</b></div>})}</div></section>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:22,paddingTop:18,borderTop:"1px solid #f0f0f0"}}><span style={{fontSize:12,color:"#6b7280"}}>Durasi final mengikuti lagu · MP4 · foto sebagai pemeran</span><button type="button" onClick={generate} disabled={!canGenerate||loading} style={{...buttonStyle,background:"#111827",color:"white",opacity:canGenerate&&!loading?1:.5}}>{loading?<><Loader2 size={16} className="spin"/> Memproses produksi…</>:<>Buat Video Musik <ArrowRight size={16}/></>}</button></div>
   </div>
  </section>
 </main>;
}
function Control({label,children}:{label:string;children:any}){return <label style={labelStyle}>{label}{children}</label>}
const eyebrow:CSSProperties={fontSize:11,fontWeight:800,letterSpacing:1.2,color:"#6b7280"};
const labelStyle:CSSProperties={display:"grid",gap:7,fontSize:11,fontWeight:800,letterSpacing:.8,color:"#6b7280"};
const inputStyle:CSSProperties={width:"100%",height:42,border:"1px solid #d1d5db",borderRadius:9,padding:"0 10px",background:"white",fontSize:14,color:"#111827"};
const textareaStyle:CSSProperties={width:"100%",boxSizing:"border-box",marginTop:7,border:"1px solid #d1d5db",borderRadius:10,padding:12,resize:"vertical",fontSize:14,lineHeight:1.6,outline:"none"};
const buttonStyle:CSSProperties={height:40,padding:"0 13px",border:"1px solid #d1d5db",borderRadius:9,background:"white",display:"inline-flex",alignItems:"center",gap:7,cursor:"pointer",fontWeight:700,fontSize:13,color:"#111827"};
const markStyle:CSSProperties={width:28,height:28,borderRadius:7,display:"grid",placeItems:"center",background:"#111827",color:"white",fontWeight:900};
const uploadBox:CSSProperties={display:"flex",alignItems:"center",gap:12,padding:14,border:"1px dashed #cbd5e1",borderRadius:10,cursor:"pointer",color:"#475569"};
const assetStyle:CSSProperties={border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 10px",fontSize:12,display:"flex",gap:8,alignItems:"center"};
const removeStyle:CSSProperties={border:0,background:"none",cursor:"pointer",display:"grid",placeItems:"center"};
const hintStyle:CSSProperties={marginTop:10,fontSize:13,color:"#6b7280"};
