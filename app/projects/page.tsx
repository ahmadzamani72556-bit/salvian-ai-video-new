"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clapperboard, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteProject, readActiveProject, readProjects, saveActiveProject, type VideoProject } from "../../lib/project-store";

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);

  function refresh() {
    const items = readProjects().sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime() || 0;
      const bTime = new Date(b.updatedAt).getTime() || 0;
      return bTime - aTime;
    });
    setProjects(items);
    setActiveProject(readActiveProject());
  }

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    const onPageShow = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.title, p.topic, p.status, p.style, p.language]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [projects, query]);

  const counts = useMemo(() => ({
    total: projects.length,
    draft: projects.filter((p) => p.status === "Draft").length,
    production: projects.filter((p) => p.status === "Produksi").length,
    ready: projects.filter((p) => p.status === "Siap Render").length,
  }), [projects]);

  function openProject(project: VideoProject) {
    const next = { ...project, updatedAt: new Date().toISOString() };
    saveActiveProject(next);
    setActiveProject(next);
    refresh();
  }

  function removeProject(event: React.MouseEvent, projectId: string, title: string) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(`Hapus project "${title}" dari library?`)) return;
    deleteProject(projectId);
    refresh();
  }

  return (
    <main className="dash-shell">
      <nav className="dash-nav">
        <Link href="/" className="brand"><img className="brand-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <span className="user-pill">Saldo Creator</span>
      </nav>
      <section className="dash-main">
        <Link href="/dashboard" className="back"><ArrowLeft size={16}/> Dashboard</Link>
        <div className="dash-head">
          <div><div className="eyebrow">PROJECT LIBRARY</div><h1>Semua project.</h1><p>Kelola, cari, hapus, dan lanjutkan semua video yang pernah Anda buat.</p></div>
          <Link href="/create" className="primary">Buat Video Baru <ArrowRight size={17}/></Link>
        </div>

        <div className="project-box" style={{ marginBottom: 16 }}>
          <div className="project-list" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            <div className="project-info"><strong>{counts.total}</strong><span>Total Project</span></div>
            <div className="project-info"><strong>{counts.draft}</strong><span>Draft</span></div>
            <div className="project-info"><strong>{counts.production}</strong><span>Produksi</span></div>
            <div className="project-info"><strong>{counts.ready}</strong><span>Siap Render</span></div>
          </div>
        </div>

        <div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari judul, topik, status, style, atau bahasa..." /></div>
        <div className="project-box"><div className="project-list">
          {filtered.map((p) => <Link href={`/workspace?project=${encodeURIComponent(p.title)}&projectId=${encodeURIComponent(p.id)}`} onClick={() => openProject(p)} className="project" key={p.id}>
            <div className="project-icon"><Clapperboard size={18}/></div>
            <div className="project-info"><strong>{p.title}</strong><span>{p.duration} menit · {p.scenes.length} scene · {p.ratio || "16:9"}{activeProject?.id === p.id ? " · Aktif sekarang" : ""}</span></div>
            <span className="status">{p.status}</span>
            <button type="button" className="icon-button" aria-label={`Hapus ${p.title}`} onClick={(e) => removeProject(e, p.id, p.title)}><Trash2 size={16}/></button>
            <ArrowRight size={17} className="row-arrow"/>
          </Link>)}
          {!filtered.length && <div className="empty-state"><Clapperboard size={26}/><strong>{projects.length ? "Project tidak ditemukan." : "Belum ada project."}</strong><span>{projects.length ? "Coba kata kunci lain." : "Buat video pertama Anda dari Studio Produksi."}</span><Link href="/create" className="primary">Buat Video Baru <ArrowRight size={16}/></Link></div>}
        </div></div>
        <div className="project-box" style={{ marginTop: 16 }}>
          <div className="box-title"><div><div className="eyebrow">PROJECT CONTRACT</div><h2>Siap untuk engine</h2></div></div>
          <p style={{ color: "#8f8fa3", lineHeight: 1.7, margin: 0 }}>Setiap project memakai satu kontrak data bersama untuk Studio, Workspace, dan Render. Saat engine provider disambungkan, data project ini menjadi input produksi tanpa mengubah alur creator.</p>
        </div>
      </section>
    </main>
  );
}
