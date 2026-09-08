"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clapperboard, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { makeProjectId, readActiveProject, saveActiveProject, type VideoProject } from "../../lib/project-store";

const starterProjects: VideoProject[] = [
  { id: makeProjectId("Belajar Membuat Channel YouTube"), title: "Belajar Membuat Channel YouTube", status: "Draft", duration: 7, scenes: [], updatedAt: "" },
  { id: makeProjectId("Rahasia Rezeki dalam Kehidupan"), title: "Rahasia Rezeki dalam Kehidupan", status: "Produksi", duration: 8, scenes: [], updatedAt: "" },
  { id: makeProjectId("Tips Creator Pemula 2026"), title: "Tips Creator Pemula 2026", status: "Siap Render", duration: 5, scenes: [], updatedAt: "" },
];

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    setActiveProject(readActiveProject());
  }, []);

  const projects = useMemo(() => {
    if (!activeProject) return starterProjects;
    return [activeProject, ...starterProjects.filter((p) => p.title !== activeProject.title)];
  }, [activeProject]);

  const filtered = useMemo(() => projects.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())), [projects, query]);

  function openProject(project: VideoProject) {
    saveActiveProject({ ...project, updatedAt: new Date().toISOString() });
  }

  return (
    <main className="dash-shell">
      <nav className="dash-nav">
        <Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <span className="user-pill">Saldo Creator</span>
      </nav>
      <section className="dash-main">
        <Link href="/dashboard" className="back"><ArrowLeft size={16}/> Dashboard</Link>
        <div className="dash-head">
          <div><div className="eyebrow">PROJECT LIBRARY</div><h1>Semua project.</h1><p>Kelola dan lanjutkan semua video yang pernah Anda buat.</p></div>
          <Link href="/create" className="primary">Buat Video Baru <ArrowRight size={17}/></Link>
        </div>
        <div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari project..." /></div>
        <div className="project-box"><div className="project-list">
          {filtered.map((p) => <Link href={`/workspace?project=${encodeURIComponent(p.title)}`} onClick={() => openProject(p)} className="project" key={p.id}>
            <div className="project-icon"><Clapperboard size={18}/></div>
            <div className="project-info"><strong>{p.title}</strong><span>{p.duration} menit{activeProject?.title === p.title && activeProject.updatedAt ? " · Aktif sekarang" : ""}</span></div>
            <span className="status">{p.status}</span><ArrowRight size={17} className="row-arrow"/>
          </Link>)}
          {!filtered.length && <div className="empty-state">Project tidak ditemukan.</div>}
        </div></div>
        <div className="project-box" style={{ marginTop: 16 }}>
          <div className="box-title"><div><div className="eyebrow">PROJECT CONTRACT</div><h2>Siap untuk engine</h2></div></div>
          <p style={{ color: "#8f8fa3", lineHeight: 1.7, margin: 0 }}>Setiap project memakai satu kontrak data bersama untuk Studio, Workspace, dan Render. Saat engine provider disambungkan, data project ini menjadi input produksi tanpa mengubah alur creator.</p>
        </div>
      </section>
    </main>
  );
}
