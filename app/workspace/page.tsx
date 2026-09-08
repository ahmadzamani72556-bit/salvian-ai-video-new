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

export default function WorkspacePage() {
  const [title, setTitle] = useState("Belajar Membuat Channel YouTube");
  const [status, setStatus] = useState("Draft");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("salvian-video-workspace");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.title) setTitle(data.title);
      if (data.status) setStatus(data.status);
    } catch {}
  }, []);

  const projectCount = useMemo(() => defaultProjects.length, []);

  function saveWorkspace() {
    localStorage.setItem("salvian-video-workspace", JSON.stringify({ title, status, updatedAt: new Date().toISOString() }));
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
          <div><div className="eyebrow">PROJECT WORKSPACE</div><h1>Ruang kerja video.</h1><p>Atur produksi, asset, timeline, dan lanjutkan project tanpa kehilangan pekerjaan.</p></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="secondary-btn" onClick={saveWorkspace}><Save size={16} /> {saved ? "Tersimpan" : "Simpan Draft"}</button><Link href="/create" className="primary"><WandSparkles size={16} /> Buka Studio</Link></div>
        </div>
        <div className="workspace-grid" style={{ marginTop: 28 }}>
          <section className="form-card"><div className="eyebrow">PROJECT INFO</div><label htmlFor="project-title">NAMA PROJECT</label><input id="project-title" value={title} onChange={e => setTitle(e.target.value)} className="workspace-input" /><label>STATUS PRODUKSI</label><div className="status-grid">{["Draft", "Produksi", "Siap Render", "Selesai"].map(item => <button key={item} onClick={() => setStatus(item)} className={status === item ? "status-choice active" : "status-choice"}>{item}</button>)}</div><div className="workspace-meta"><span><Clapperboard size={15} /> {projectCount} project aktif di library</span><span>Durasi target 7 menit</span></div></section>
          <section className="form-card"><div className="eyebrow">PRODUCTION FLOW</div><div className="flow-list">{["Konsep", "Script", "Storyboard", "Audio", "Visual", "Subtitle", "Timeline"].map((step, i) => <Link href="/create" key={step} className="flow-item"><span>{String(i + 1).padStart(2, "0")}</span><strong>{step}</strong><small>{i < 2 ? "Siap diedit" : "Lanjutkan di Studio"}</small><Play size={14} /></Link>)}</div></section>
        </div>
        <section className="form-card" style={{ marginTop: 16 }}><div className="box-title"><div><div className="eyebrow">ASSET LIBRARY</div><h2>Asset project</h2></div><button className="secondary-btn"><Upload size={15} /> Upload Asset</button></div><div className="asset-grid">{assets.map(asset => <div className="asset-card" key={asset}><div className="asset-placeholder"><FolderOpen size={22} /></div><strong>{asset}</strong><span>Belum ada asset</span></div>)}<div className="asset-card asset-add"><div className="asset-placeholder"><Plus size={22} /></div><strong>Tambah asset</strong><span>Upload gambar, video, atau audio</span></div></div></section>
        <section className="form-card" style={{ marginTop: 16 }}><div className="box-title"><div><div className="eyebrow">RENDER CENTER</div><h2>Siapkan output akhir</h2></div><Link href="/render" className="primary">Buka Render Center <Play size={15} /></Link></div><div className="workspace-checks"><span>✓ Script</span><span>✓ Storyboard</span><span>✓ Audio</span><span>✓ Visual</span><span>✓ Subtitle</span></div><p className="workspace-note">Saldo kredit dikelola melalui Salvian AI Creator. Workspace ini belum mengurangi kredit sampai render final benar-benar terhubung.</p></section>
      </section>
    </main>
  );
}
