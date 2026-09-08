"use client";

import Link from "next/link";
import { ArrowRight, Clapperboard, FolderOpen, Sparkles, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readActiveProject, type VideoProject } from "../../lib/project-store";

const starterProjects: VideoProject[] = [
  { id: "starter-belajar-channel", title: "Belajar Membuat Channel YouTube", status: "Draft", duration: 7, scenes: [], updatedAt: "" },
  { id: "starter-rezeki", title: "Rahasia Rezeki dalam Kehidupan", status: "Siap diedit", duration: 8, scenes: [], updatedAt: "" },
  { id: "starter-creator", title: "Tips Creator Pemula 2026", status: "Siap Render", duration: 5, scenes: [], updatedAt: "" },
];

export default function Dashboard() {
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    setActiveProject(readActiveProject());
  }, []);

  const projects = useMemo(() => {
    if (!activeProject) return starterProjects;
    return [activeProject, ...starterProjects.filter((p) => p.title !== activeProject.title)];
  }, [activeProject]);

  const totalScenes = activeProject?.scenes?.length || 0;
  const completed = projects.filter((p) => p.status === "Selesai").length;
  const creditsLabel = "Saldo Creator";

  return (
    <main className="dash-shell">
      <nav className="dash-nav">
        <Link href="/" className="brand"><img className="brand-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <div className="user-pill">{creditsLabel} <span>Terhubung</span></div>
      </nav>
      <section className="dash-main">
        <div className="dash-head">
          <div><div className="eyebrow">WORKSPACE CREATOR</div><h1>Selamat datang kembali.</h1><p>Semua proses pembuatan video YouTube Anda ada di satu tempat.</p></div>
          <Link href="/create" className="primary"><Sparkles size={17}/> Buat Video Baru <ArrowRight size={17}/></Link>
        </div>
        <div className="stats">
          <Stat icon={<WalletCards/>} label="Kredit tersedia" value="Creator" />
          <Stat icon={<Clapperboard/>} label="Project aktif" value={activeProject ? "1" : "0"} />
          <Stat icon={<FolderOpen/>} label="Video selesai" value={String(completed)} />
        </div>
        <div className="project-box">
          <div className="box-title"><div><div className="eyebrow">PROJECT TERBARU</div><h2>Riwayat video</h2></div><Link href="/projects">Lihat semua <ArrowRight size={15}/></Link></div>
          <div className="project-list">
            {projects.map((p) => (
              <Link className="project" href={`/workspace?project=${encodeURIComponent(p.title)}`} key={p.id}>
                <div className="project-icon"><Clapperboard size={18}/></div>
                <div className="project-info"><strong>{p.title}</strong><span>{p.duration} menit{activeProject?.title === p.title && totalScenes ? ` · ${totalScenes} scene` : ""}</span></div>
                <span className="status">{p.status}</span><ArrowRight size={17} className="row-arrow"/>
              </Link>
            ))}
          </div>
        </div>
        <div className="project-box" style={{ marginTop: 16 }}>
          <div className="box-title"><div><div className="eyebrow">PRODUCTION FLOW</div><h2>Lanjutkan produksi</h2></div></div>
          <div className="project-list">
            <Link className="project" href={activeProject ? `/create?project=${encodeURIComponent(activeProject.title)}&from=dashboard&tab=Konsep` : "/create"}><div className="project-icon"><Sparkles size={18}/></div><div className="project-info"><strong>Studio Produksi</strong><span>Konsep → Script → Storyboard → Audio → Visual → Subtitle → Render</span></div><ArrowRight size={17} className="row-arrow"/></Link>
            <Link className="project" href={activeProject ? `/render?project=${encodeURIComponent(activeProject.title)}&projectId=${encodeURIComponent(activeProject.id)}&from=dashboard` : "/render"}><div className="project-icon"><Clapperboard size={18}/></div><div className="project-info"><strong>Render Center</strong><span>Siapkan output akhir project aktif</span></div><ArrowRight size={17} className="row-arrow"/></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
