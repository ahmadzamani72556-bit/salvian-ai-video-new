"use client";
import Link from "next/link";
import { ArrowLeft, Music2, Upload, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { readActiveProject, saveActiveProject, type MusicAsset } from "../../lib/project-store";

async function estimateBpm(file: File): Promise<{ duration:number; bpm?:number }> {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return { duration: 0 };
  const ctx = new AudioContextCtor();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.max(1, Math.floor(sampleRate * 0.05));
    const energies:number[]=[];
    for(let i=0;i<channel.length;i+=windowSize){let sum=0;const end=Math.min(channel.length,i+windowSize);for(let j=i;j<end;j+=4)sum+=Math.abs(channel[j]);energies.push(sum/Math.max(1,Math.floor((end-i)/4)));}
    const mean=energies.reduce((a,b)=>a+b,0)/Math.max(1,energies.length);
    const peaks:number[]=[];
    for(let i=1;i<energies.length-1;i++)if(energies[i]>mean*1.7&&energies[i]>=energies[i-1]&&energies[i]>=energies[i+1])peaks.push(i*0.05);
    const intervals:number[]=[];for(let i=1;i<peaks.length;i++){const d=peaks[i]-peaks[i-1];if(d>=0.25&&d<=1.2)intervals.push(d);}
    if(!intervals.length)return {duration:buffer.duration};
    const median=intervals.sort((a,b)=>a-b)[Math.floor(intervals.length/2)];
    const bpm=Math.round(60/median);
    return {duration:buffer.duration,bpm:bpm<60?bpm*2:bpm>180?Math.round(bpm/2):bpm};
  } finally { await ctx.close().catch(()=>{}); }
}

export default function MusicPage(){
 const [asset,setAsset]=useState<MusicAsset|null>(null),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[message,setMessage]=useState("");
 async function choose(file:File|null){if(!file)return;setBusy(true);setMessage("Menganalisis durasi dan ritme lagu…");try{const info=await estimateBpm(file);if(file.size>5.5*1024*1024)throw new Error("File terlalu besar untuk penyimpanan mandiri di project. Gunakan MP3/M4A yang lebih kecil.");const reader=new FileReader();const dataUrl=await new Promise<string>((resolve,reject)=>{reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("File tidak dapat dibaca."));reader.readAsDataURL(file);});setAsset({name:file.name,url:dataUrl,mimeType:file.type,durationSeconds:Number(info.duration.toFixed(2)),bpm:info.bpm,syncMode:"phrase",energy:"medium"});setMessage(info.bpm?`Ritme terdeteksi sekitar ${info.bpm} BPM.`:"Ritme belum dapat dipastikan otomatis; Salvian tetap dapat mengikuti struktur audio.");}catch(e){setMessage(e instanceof Error?e.message:"Gagal membaca lagu.");}finally{setBusy(false)}}
 function save(){const project=readActiveProject();if(!project||!asset){setMessage("Buat/pilih project terlebih dahulu.");return;}saveActiveProject({...project,musicAsset:asset,music:asset.name,audio:{...(project.audio||{voice:project.voice||"Narator Natural",music:asset.name,language:project.language||"Indonesia",voiceVolume:100,musicVolume:35,fadeIn:true,fadeOut:true,voiceEngine:"Provider Voice",musicEngine:"Uploaded Track",ducking:true,muted:false}),music:asset.name,musicEngine:"Uploaded Track"},updatedAt:new Date().toISOString()});setSaved(true);setMessage("Lagu tersimpan. Salvian akan memakai lagu ini sebagai referensi ritme untuk storyboard, shot timing, transisi, dan pacing.");}
 const project=readActiveProject();
 return <main className="create-shell" style={{minHeight:"100vh",padding:"32px 18px"}}><div style={{maxWidth:900,margin:"0 auto"}}><Link href={project?`/render?project=${encodeURIComponent(project.title)}&projectId=${encodeURIComponent(project.id)}`:"/workspace"} className="back"><ArrowLeft size={16}/> Kembali</Link><section className="form-card studio-card" style={{marginTop:20}}><div className="section-heading"><div><div className="eyebrow">MUSIC SYNC</div><h1>Gunakan lagu yang sudah jadi</h1><p style={{opacity:.7}}>Lagu, nasyid, instrumental, atau musik lain dapat menjadi dasar ritme video. Detail mesin tetap rahasia.</p></div><Music2 size={28}/></div><label className="secondary-btn upload-label" style={{display:"inline-flex",cursor:"pointer"}}><Upload size={16}/> Pilih Lagu<input type="file" accept="audio/*" hidden disabled={busy} onChange={e=>choose(e.target.files?.[0]||null)}/></label>{asset&&<div className="script-note" style={{marginTop:18}}><CheckCircle2 size={18}/><div><strong>{asset.name}</strong><span>{asset.durationSeconds?`${Math.floor(asset.durationSeconds/60)}:${String(Math.floor(asset.durationSeconds%60)).padStart(2,"0")}`:"Durasi terdeteksi"} · {asset.bpm?`${asset.bpm} BPM · `:""}Sinkronisasi {asset.syncMode}</span></div></div>}<div className="control-grid" style={{marginTop:18}}><label className="control">MODE SINKRONISASI<select value={asset?.syncMode||"phrase"} onChange={e=>asset&&setAsset({...asset,syncMode:e.target.value as MusicAsset["syncMode"]})}><option value="beat">Beat — potongan mengikuti ketukan</option><option value="phrase">Phrase — mengikuti bagian/frasa musik</option><option value="free">Free — musik menjadi ambience</option></select></label><label className="control">ENERGI<select value={asset?.energy||"medium"} onChange={e=>asset&&setAsset({...asset,energy:e.target.value as MusicAsset["energy"]})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>{message&&<div className="workspace-note" style={{marginTop:18}}>{message}</div>}<button className="primary" type="button" disabled={!asset||busy} onClick={save} style={{marginTop:18}}><Sparkles size={16}/> {saved?"Lagu Tersimpan":"Gunakan Lagu untuk Video"}</button><div className="workspace-note" style={{marginTop:18}}>Salvian akan menggunakan lagu sebagai <strong>reference audio</strong>: timing shot, perubahan scene, pacing, transisi, dan intensitas visual dapat mengikuti struktur musik. Video final tetap satu file utuh sesuai durasi project.</div></section></div></main>;
}
