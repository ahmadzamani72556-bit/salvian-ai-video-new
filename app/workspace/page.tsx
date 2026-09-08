"use client";

import "./workspace.css";
import Link from "next/link";
import { ArrowLeft, Bot, Clapperboard, FolderOpen, Gem, Play, Plus, Save, Sparkles, Upload, WandSparkles } from "lucide-react";
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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTitle = params.get("project");
    const rawActive = localStorage.getItem("salvian-video-active-project");
    const rawWorkspace = localStorage.getItem("salvian-video-workspace");
    let active: { title?: string; status?: string; duration?: string } | null = null;
    try { if (rawActive) active = JSON.parse(rawActive); } catch {}
    const selected = defaultProjects.find(p => p.title === requestedTitle) ?? defaultProjects.find(p => p.title === active?.title);
    if (selected) {
      setTitle(selected.title); setStatus(selected.status); setDuration(selected.duration);
      localStorage.setItem("salvian-video-workspace", JSON.stringify({ ...selected, updatedAt: new Date().toISOString() }));
      return;
    }
    try {
      if (rawWorkspace) { const data = JSON.parse(rawWorkspace); if (data.title) setTitle(data.title); if (data.status) setStatus(data.status); if (data.duration) setDuration(data.duration); }
    } catch {}
  }, []);

  const projectCount = useMemo(() => defaultProjects.length, []);
  const studioHref = `/create?project=${encodeURIComponent(title)}&from=workspace`;
  const renderHref = `/render?project=${encodeURIComponent(title)}&from=workspace`;

  function saveWorkspace() {
    const data = { title, status, duration, updatedAt: new Date().toISOString() };
    localStorage.setItem("salvian-video-workspace", JSON.stringify(data));
    localStorage.setItem("salvian-video-active-project", JSON.stringify({ title, status, duration }));
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }

  function askAssistant() {
    if (!assistantMessage.trim()) return;
    const text = assistantMessage.trim();
    setAssistantMessage(`AI Assistant menerima: ${text}`);
  }

  return (
    <main className="dash-shell">
      <nav className="dash-nav">
        <Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><span className="user-pill">Saldo Creator</span><button className="secondary-btn" type="button" onClick={() => setAssistantOpen(true)}><Bot size={16} /> AI Assistant</button></div>
      </nav>
      <section className="dash-main">
        <Link href="/projects" className="back"><ArrowLeft size={16} /> Project Library</Link>
        <div className="dash-head">
          <div><div className="eyebrow">PROJECT WORKSPACE</div><h1>Ruang kerja video.</h1><p>Project aktif: <strong>{title}</strong></p></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="secondary-btn" onClick={saveWorkspace}><Save size={16} /> {saved ? "Tersimpan" : "Simpan Draft"}</button><Link href={studioHref} className="primary"><WandSparkles size={16} /> Buka Studio</Link></div>
        </div>

        <section className="form-card" style={{ marginTop: 16 }}>
          <div className="box-title"><div><div className="eyebrow">AI CREATOR SUITE</div><h2>Asisten produksi</h2></div><span className="ready-pill"><Sparkles size={14}/> AI READY</span></div>
          <div className="workspace-ai-grid">
            <button className="ai-feature-card" type="button" onClick={() => setAssistantOpen(true)}><span className="ai-icon"><Bot size={20}/></span><strong>AI Assistant</strong><small>Bantu script, storyboard, audio, visual, subtitle, dan SEO.</small><b>Buka Asisten →</b></button>
            <div className="ai-feature-card pro-card"><span className="ai-icon"><Gem size={20}/></span><strong>PRO</strong><small>Workflow produksi lanjutan, kualitas output tinggi, dan fitur AI premium.</small><b>Fitur Premium</b></div>
            <div className="ai-feature-card adroit-card"><span className="ai-icon"><WandSparkles size={20}/></span><strong>ADROIT</strong><small>Lapisan AI pintar untuk membantu mengoptimalkan workflow project secara otomatis.</small><b>Smart Workflow</b></div>
          </div>
        </section>

        <div className="workspace-grid" style={{ marginTop: 16 }}>
          <section className="form-card"><div className="eyebrow">PROJECT INFO</div><label htmlFor="project-title">NAMA PROJECT</label><input id="project-title" value={title} onChange={e => setTitle(e.target.value)} className="workspace-input" /><label>STATUS PRODUKSI</label><div className="status-grid">{statuses.map(item => <button key={item} type="button" onClick={() => setStatus(item)} className={status === item ? "status-choice active" : "status-choice"}>{item}</button>)}</div><div className="workspace-meta"><span><Clapperboard size={15} /> {projectCount} project di library</span><span>Durasi target {duration}</span></div></section>
          <section className="form-card"><div className="eyebrow">PRODUCTION FLOW</div><div className="flow-list">{["Konsep", "Script", "Storyboard", "Audio", "Visual", "Subtitle", "Timeline"].map((step, i) => <Link href={`${studioHref}&tab=${encodeURIComponent(step)}`} key={step} className="flow-item"><span>{String(i + 1).padStart(2, "0")}</span><strong>{step}</strong><small>{i < 2 ? "Siap diedit" : "Lanjutkan di Studio"}</small><Play size={14} /></Link>)}</div></section>
        </div>
        <section className="form-card" style={{ marginTop: 16 }}><div className="box-title"><div><div className="eyebrow">ASSET LIBRARY</div><h2>Asset project</h2></div><button className="secondary-btn" type="button"><Upload size={15} /> Upload Asset</button></div><div className="asset-grid">{assets.map(asset => <div className="asset-card" key={asset}><div className="asset-placeholder"><FolderOpen size={22} /></div><strong>{asset}</strong><span>Belum ada asset</span></div>)}<div className="asset-card asset-add"><div className="asset-placeholder"><Plus size={22} /></div><strong>Tambah asset</strong><span>Upload gambar, video, atau audio</span></div></div></section>
        <section className="form-card" style={{ marginTop: 16 }}><div className="box-title"><div><div className="eyebrow">MONETIZATION</div><h2>Paket & kredit</h2></div><Gem size={20}/></div><div className="monetization-grid"><div><strong>FREE</strong><span>100 kredit awal · workflow dasar</span><small>Untuk mencoba Salvian AI Video</small></div><div className="premium-plan"><strong>PRO · PREMIUM</strong><span>1.000 kredit / bulan · fitur AI lanjutan</span><small>Pembelian dan saldo dikelola melalui Salvian AI Creator</small><Link href="/pricing" className="primary">Lihat Paket</Link></div></div></section>
        <section className="form-card" style={{ marginTop: 16 }}><div className="box-title"><div><div className="eyebrow">RENDER CENTER</div><h2>Siapkan output akhir</h2></div><Link href={renderHref} className="primary">Buka Render Center <Play size={15} /></Link></div><div className="workspace-checks"><span>✓ Script</span><span>✓ Storyboard</span><span>✓ Audio</span><span>✓ Visual</span><span>✓ Subtitle</span></div><p className="workspace-note">Saldo kredit dikelola melalui Salvian AI Creator. Pembayaran belum diproses dari halaman ini.</p></section>
      </section>

      {assistantOpen && <div className="ai-modal-backdrop" onClick={() => setAssistantOpen(false)}><section className="ai-assistant-modal" onClick={e => e.stopPropagation()}><div className="box-title"><div><div className="eyebrow">SALVIAN AI ASSISTANT</div><h2>Teman produksi project</h2></div><button className="secondary-btn" type="button" onClick={() => setAssistantOpen(false)}>Tutup</button></div><div className="ai-chat"><div className="ai-bubble"><Bot size={17}/><div><strong>AI Assistant</strong><p>Saya siap membantu project <b>{title}</b>. Mau membuat script, storyboard, voice-over, visual, subtitle, atau SEO?</p></div></div>{assistantMessage && <div className="ai-user-bubble">{assistantMessage}</div>}</div><div className="ai-quick-actions"><button type="button" onClick={() => setAssistantMessage("Buatkan ide script untuk project ini")}>Buat Script</button><button type="button" onClick={() => setAssistantMessage("Susun storyboard project ini")}>Storyboard</button><button type="button" onClick={() => setAssistantMessage("Optimalkan SEO YouTube")}>SEO YouTube</button><button type="button" onClick={() => setAssistantMessage("Optimalkan workflow dengan ADROIT")}>ADROIT</button></div><div className="ai-input-row"><input value={assistantMessage} onChange={e => setAssistantMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter") askAssistant(); }} placeholder="Tulis kebutuhan Anda..."/><button className="primary" type="button" onClick={askAssistant}>Kirim</button></div><p className="workspace-note">Panel ini adalah body/UI AI Assistant. Mesin AI dan koneksi akun/kredit akan disambungkan pada tahap integrasi.</p></section></div>}
    </main>
  );
}
