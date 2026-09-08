import "../studio.css";
import "./render.css";

"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Film, Gauge, HardDrive, MonitorPlay, Play, Sparkles } from "lucide-react";
import { useState } from "react";

const resolutions = ["720p", "1080p", "4K"];
const fpsOptions = ["24 FPS", "30 FPS", "60 FPS"];
const qualities = ["Standard", "High", "Maximum"];

export default function RenderPage() {
  const [resolution, setResolution] = useState("1080p");
  const [fps, setFps] = useState("30 FPS");
  const [quality, setQuality] = useState("High");
  const [format, setFormat] = useState("MP4");
  const [status, setStatus] = useState("READY");
  const credits = resolution === "4K" ? 45 : resolution === "1080p" ? 30 : 20;

  return (
    <main className="render-shell">
      <nav className="dash-nav">
        <Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <div className="studio-nav-actions"><span className="user-pill">Saldo terhubung ke Creator</span><Link href="/dashboard" className="secondary-btn">Dashboard</Link></div>
      </nav>
      <section className="render-main">
        <Link href="/create" className="back"><ArrowLeft size={16}/> Kembali ke Studio</Link>
        <div className="render-hero"><div><div className="eyebrow">07 · RENDER CENTER</div><h1>Render Final Video</h1><p>Siapkan kualitas output sebelum produksi final. Pembayaran kredit tetap dikelola oleh Salvian AI Creator.</p></div><span className="ready-pill"><CheckCircle2 size={14}/> {status}</span></div>
        <div className="render-grid">
          <section className="form-card studio-card">
            <div className="section-heading"><div><div className="eyebrow">OUTPUT SETTINGS</div><h2>Pengaturan Export</h2></div><Film size={20}/></div>
            <RenderChoices label="RESOLUSI" items={resolutions} value={resolution} onChange={setResolution}/>
            <RenderChoices label="FRAME RATE" items={fpsOptions} value={fps} onChange={setFps}/>
            <RenderChoices label="KUALITAS" items={qualities} value={quality} onChange={setQuality}/>
            <div className="render-setting"><label>FORMAT</label><select value={format} onChange={e=>setFormat(e.target.value)}><option>MP4</option><option>WebM</option></select></div>
            <div className="render-summary"><div><span><MonitorPlay size={15}/> Output</span><strong>{format} · {resolution}</strong></div><div><span><Gauge size={15}/> Frame rate</span><strong>{fps}</strong></div><div><span><HardDrive size={15}/> Quality</span><strong>{quality}</strong></div><div><span><Sparkles size={15}/> Estimasi kredit</span><strong>{credits} kredit</strong></div></div>
            <button className="primary render-button" type="button" onClick={()=>setStatus("READY TO RENDER")}><Play size={17}/> Siapkan Render Final</button>
          </section>
          <aside className="render-preview">
            <div className="preview-head"><div><div className="eyebrow">FINAL PREVIEW</div><strong>Canvas 16:9</strong></div><span className="preview-dot">{status}</span></div>
            <div className="render-canvas"><div className="preview-grid"/><div className="preview-center"><Play size={22}/></div><span>Preview final akan tampil setelah scene, audio, visual, dan subtitle siap.</span></div>
            <div className="render-checklist"><div><CheckCircle2 size={15}/> Script</div><div><CheckCircle2 size={15}/> Storyboard</div><div><CheckCircle2 size={15}/> Audio</div><div><CheckCircle2 size={15}/> Visual</div><div><CheckCircle2 size={15}/> Subtitle</div></div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function RenderChoices({label,items,value,onChange}:{label:string;items:string[];value:string;onChange:(v:string)=>void}){return <div className="render-setting"><label>{label}</label><div className="choice-row">{items.map(x=><button key={x} type="button" className={value===x?"choice-active":""} onClick={()=>onChange(x)}>{x}</button>)}</div></div>}
