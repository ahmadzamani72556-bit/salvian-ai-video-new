"use client";

import "../studio.css";
import "./render.css";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Film, Gauge, HardDrive, MonitorPlay, Play, Save, Sparkles, Circle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createProjectId, readProject, readActiveProject, readRenderSettings, saveRenderSettings, type VideoProject } from "../../lib/project-store";

const resolutions = ["720p", "1080p", "4K"];
const fpsOptions = ["24 FPS", "30 FPS", "60 FPS"];
const qualities = ["Standard", "High", "Maximum"];

type ReadinessItem = { label: string; ready: boolean; detail: string };

export default function RenderPage() {
  const [resolution, setResolution] = useState("1080p");
  const [fps, setFps] = useState("30 FPS");
  const [quality, setQuality] = useState("High");
  const [format, setFormat] = useState("MP4");
  const [status, setStatus] = useState("READY");
  const [project, setProject] = useState("Project Video");
  const [projectId, setProjectId] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("7 menit");
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [saved, setSaved] = useState(false);
  const credits = resolution === "4K" ? 45 : resolution === "1080p" ? 30 : 20;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("project");
    const requestedId = params.get("projectId");
    const active = readActiveProject();
    const selected = readProject(requestedId || undefined, requested || undefined) || (!requestedId && !requested ? active : null);
    const title = selected?.title || requested || active?.title || "Project Video";
    const id = selected?.id || requestedId || (active?.title === title ? active.id : createProjectId(title));

    setActiveProject(selected);
    setProject(title);
    setProjectId(id);
    setRatio(selected?.ratio || "16:9");
    setDuration(`${selected?.duration || 7} menit`);
    if (selected?.status) setStatus(selected.status === "Siap Render" ? "READY TO RENDER" : "READY");

    const stored = readRenderSettings(id);
    if (stored) {
      setResolution(stored.resolution || "1080p");
      setFps(stored.fps || "30 FPS");
      setQuality(stored.quality || "High");
      setFormat(stored.format || "MP4");
    }
  }, []);

  const workspaceHref = `/workspace?project=${encodeURIComponent(project)}&projectId=${encodeURIComponent(projectId)}`;
  const studioHref = `/create?project=${encodeURIComponent(project)}&projectId=${encodeURIComponent(projectId)}&from=render`;

  const readiness = useMemo<ReadinessItem[]>(() => {
    const p = activeProject;
    return [
      { label: "Konsep / Script", ready: Boolean(p?.topic?.trim() || p?.script?.trim()), detail: p?.script?.trim() ? "Naskah tersimpan" : p?.topic ? "Topik tersimpan" : "Isi konsep di Studio" },
      { label: "Storyboard", ready: Boolean(p?.scenes?.length), detail: p?.scenes?.length ? `${p.scenes.length} scene tersimpan` : "Belum ada scene" },
      { label: "Audio", ready: Boolean(p?.audio?.voice || p?.audio?.music || p?.voice || p?.music), detail: p?.audio ? `${p.audio.voice} · ${p.audio.music}` : p?.voice || p?.music ? "Voice/music terset" : "Belum dikonfigurasi" },
      { label: "Visual", ready: Boolean(p?.visual?.style?.trim() || p?.style?.trim()), detail: p?.visual?.style || p?.style ? `${p.visual?.style || p.style} · ${p.visual?.cameraMotion || "Smart camera"}` : "Belum memilih gaya" },
      { label: "Subtitle", ready: Boolean(p?.subtitle?.language?.trim() || p?.language?.trim()), detail: p?.subtitle ? `${p.subtitle.enabled ? "Aktif" : "Manual"} · ${p.subtitle.language}` : p?.language ? `Bahasa ${p.language}` : "Bahasa belum dipilih" },
      { label: "Timeline", ready: Boolean(p?.timeline), detail: p?.timeline ? `${p.timeline.pacing} pacing · transition ${p.timeline.transitionDuration}s` : "Belum disiapkan" },
    ];
  }, [activeProject]);

  const readyCount = readiness.filter((item) => item.ready).length;
  const canPrepare = readyCount >= 5;

  function saveSettings() {
    const id = projectId || createProjectId(project);
    if (!projectId) setProjectId(id);
    saveRenderSettings({ projectId: id, projectTitle: project, resolution, fps, quality, format, updatedAt: new Date().toISOString() });
    setSaved(true);
    setStatus(canPrepare ? "READY TO RENDER" : "SETTINGS SAVED");
    window.setTimeout(() => setSaved(false), 1800);
  }

  const outputSummary = useMemo(() => `${format} · ${resolution} · ${fps} · ${quality}`, [format, resolution, fps, quality]);

  return (
    <main className="render-shell">
      <nav className="dash-nav">
        <Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <div className="studio-nav-actions"><span className="user-pill">Saldo terhubung ke Creator</span><Link href="/dashboard" className="secondary-btn">Dashboard</Link></div>
      </nav>
      <section className="render-main">
        <Link href={studioHref} className="back"><ArrowLeft size={16}/> Kembali ke Studio</Link>
        <div className="render-hero"><div><div className="eyebrow">07 · RENDER CENTER</div><h1>Render Final Video</h1><p>Project aktif: <strong>{project}</strong> · {duration}</p><p>Siapkan kualitas output sebelum produksi final. Pembayaran kredit tetap dikelola oleh Salvian AI Creator.</p></div><span className="ready-pill"><CheckCircle2 size={14}/> {status}</span></div>
        <div className="render-grid">
          <section className="form-card studio-card">
            <div className="section-heading"><div><div className="eyebrow">OUTPUT SETTINGS</div><h2>Pengaturan Export</h2></div><Film size={20}/></div>
            <RenderChoices label="RESOLUSI" items={resolutions} value={resolution} onChange={setResolution}/>
            <RenderChoices label="FRAME RATE" items={fpsOptions} value={fps} onChange={setFps}/>
            <RenderChoices label="KUALITAS" items={qualities} value={quality} onChange={setQuality}/>
            <div className="render-setting"><label>FORMAT</label><select value={format} onChange={e=>setFormat(e.target.value)}><option>MP4</option><option>WebM</option></select></div>
            <div className="render-summary"><div><span><MonitorPlay size={15}/> Output</span><strong>{format} · {resolution}</strong></div><div><span><Gauge size={15}/> Frame rate</span><strong>{fps}</strong></div><div><span><HardDrive size={15}/> Quality</span><strong>{quality}</strong></div><div><span><Sparkles size={15}/> Estimasi kredit</span><strong>{credits} kredit</strong></div></div>
            <button className="primary render-button" type="button" onClick={saveSettings}><Save size={17}/> {saved ? "Pengaturan Tersimpan" : "Simpan & Siapkan Render"}</button>
            <div className="workspace-note">Output: <strong>{outputSummary}</strong>. Konfigurasi Studio, termasuk audio, visual, subtitle, dan timeline, dibaca dari project aktif.</div>
            <Link href={workspaceHref} className="secondary-btn full"><ArrowLeft size={15}/> Kembali ke Workspace</Link>
          </section>
          <aside className="render-preview">
            <div className="preview-head"><div><div className="eyebrow">FINAL PREVIEW</div><strong>Canvas {ratio}</strong></div><span className="preview-dot">{readyCount}/{readiness.length} SIAP</span></div>
            <div className="render-canvas" style={{aspectRatio:ratio.replace(":","/")}}><div className="preview-grid"/><div className="preview-center"><Play size={22}/></div><span>{canPrepare ? "Project lengkap untuk diteruskan ke engine render." : "Lengkapi konsep/script, storyboard, audio, visual, subtitle, dan timeline di Studio."}</span></div>
            <div className="render-checklist">
              {readiness.map((item) => <div key={item.label} className={item.ready ? "check-ready" : "check-pending"}>{item.ready ? <CheckCircle2 size={15}/> : <Circle size={15}/>} <span>{item.label}<small>{item.detail}</small></span></div>)}
            </div>
            <Link href={studioHref} className="secondary-btn full"><Sparkles size={15}/> Lengkapi di Studio</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function RenderChoices({label,items,value,onChange}:{label:string;items:string[];value:string;onChange:(v:string)=>void}){return <div className="render-setting"><label>{label}</label><div className="choice-row">{items.map(x=><button key={x} type="button" className={value===x?"choice-active":""} onClick={()=>onChange(x)}>{x}</button>)}</div></div>}
