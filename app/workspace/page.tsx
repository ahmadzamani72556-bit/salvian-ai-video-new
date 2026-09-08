"use client";

import "./workspace.css";
import Link from "next/link";
import { ArrowLeft, Clapperboard, FolderOpen, Play, Plus, Save, Upload, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const defaultProjects = [
  { title: "Belajar Membuat Channel YouTube", status: "Draft", duration: "7 menit" },
  { title: "Rahasia Rezeki dalam Kehidupan", status: "Produksi", duration: "8 menit" },
  { title: "Tips Creator Pemula 2026", status: "Siap Render", duration: "5 menit" },
];

const assets = ["Thumbnail Frame", "Character Reference", "B-roll Library", "Background / Overlay", "Logo / Brand"];
const statuses = ["Draft", "Produksi", "Siap Render", "Selesai"];

export default function WorkspacePage() {
  const [title, setTitle] = useState("Belajar Membuat Channel YouTube");
  const [status, setStatus] = useState("Draft");
  const [duration, setDuration] = useState("7 menit");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTitle = params.get("project");
    const rawActive = localStorage.getItem("salvian-video-active-project");
    const rawWorkspace = localStorage.getItem("salvian-video-workspace");
    let active: { title?: string; status?: string; duration?: string } | null = null;
    try { if (rawActive) active = JSON.parse(rawActive); } catch {}

    const selected = defaultProjects.find(p => p.title === requestedTitle) ??
      defaultProjects.find(p => p.title === active?.title);

    if (selected) {
      setTitle(selected.title);
      setStatus(selected.status);
      setDuration(selected.duration);
      localStorage.setItem("salvian-video-workspace", JSON.stringify({ ...selected, updatedAt: new Date().toISOString() }));
      return;
    }

    try {
      if (rawWorkspace) {
        const data = JSON.parse(rawWorkspace);
        if (data.title) setTitle(data.title);
        if (data.status) setStatus(data.status);
        if (data.duration) setDuration(data.duration);
      }
    } catch {}
  }, []);

  const projectCount = useMemo(() => defaultProjects.length, []);

  function saveWorkspace() {
    localStorage.setItem("salvian-video-workspace", JSON.stringify({ title, status, duration, updatedAt: new Date().toISOString() }));
    localStorage.setItem("salvian-video-active-project", JSON.stringify({ title, status, duration }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main className="dash-shell">
      <nav className="dash-nav">
        <Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <span className="user-pill">Saldo Creator</span>
      </nav>
      <section className="dash-main">
        <Link href="/projects" className="back"><ArrowLeft size={16} /> Project Library</Link>
        <div className="dash-head">
          <div><div className="eyebrow">PROJECT WORKSPACE</div><h1>Ruang kerja video.</h1><p>Project aktif: <strong>{title}</strong></p></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="secondary-btn" onClick={saveWorkspace}><Save size={16} /> {saved ? "Tersimpan" : "Simpan Draft"}</button><Link href="/create" className="primary"><WandSparkles size={16} /> Buka Studio</Link></div>
        </div>
        <div className="workspace-grid" style={{ marginTop: 28 }}>
          <section className="form-card"><div className="eyebrow">PROJECT INFO</div><label htmlFor="project-title">NAMA PROJECT</label><input id="project-title" value={title} onChange={e => setTitle(e.target.value)} className="workspace-input" /><label>STATUS PRODUKSI</label><div className="status-grid">{statuses.map(item => <button key={item} onClick={() => setStatus(item)} className={status === item ? "status-choice active" : "status-choice"}>{item}</button>)}</div><div className="workspace-meta"><span><Clapperboard size={15} /> {projectCount} project di library</span><span>Durasi target {duration}</span></div></section>
          <section className="form-card"><div className="eyebrow">PRODUCTION FLOW</div><div className="flow-list">{["Konsep", "Script", "Storyboard", "Audio", "Visual", "Subtitle", "Timeline"].map((step, i) => <Link href="/create" key={step} className="flow-item"><span>{String(i + 1).padStart(2, "0")}</span><strong>{step}</strong><small>{i < 2 ? "Siap diedit" : "Lanjutkan di Studio"}</small><Play size={14} /></Link>)}</div></section>
        </div>
        <section className="form-card" style={{ marginTop: 16 }}><div className="box-title"><div><div className="eyebrow">ASSET LIBRARY</div><h2>Asset project</h2></div><button className="secondary-btn"><Upload size={15} /> Upload Asset</button></div><div className="asset-grid">{assets.map(asset => <div className="asset-card" key={asset}><div className="asset-placeholder"><FolderOpen size={22} /></div><strong>{asset}</strong><span>Belum ada asset</span></div>)}<div className="asset-card asset-add"><div className="asset-placeholder"><Plus size={22} /></div><strong>Tambah asset</strong><span>Upload gambar, video, atau audio</span></div></div></section>
        <section className="form-card" style={{ marginTop: 16 }}><div className="box-title"><div><div className="eyebrow">RENDER CENTER</div><h2>Siapkan output akhir</h2></div><Link href="/render" className="primary">Buka Render Center <Play size={15} /></Link></div><div className="workspace-checks"><span>✓ Script</span><span>✓ Storyboard</span><span>✓ Audio</span><span>✓ Visual</span><span>✓ Subtitle</span></div><p className="workspace-note">Saldo kredit dikelola melalui Salvian AI Creator. Workspace ini belum mengurangi kredit sampai render final benar-benar terhubung.</p></section>
      </section>
    </main>
  );
}
