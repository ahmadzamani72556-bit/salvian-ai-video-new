"use client";

import Link from "next/link";
import { ArrowRight, Clapperboard, FolderOpen, Sparkles, WalletCards } from "lucide-react";

const projects = [
  { title: "Belajar Membuat Channel YouTube", status: "Draft", duration: "7 menit" },
  { title: "Rahasia Rezeki dalam Kehidupan", status: "Siap diedit", duration: "8 menit" },
  { title: "Tips Creator Pemula 2026", status: "Diproses", duration: "5 menit" },
];

export default function Dashboard() {
  return (
    <main className="dash-shell">
      <nav className="dash-nav"><Link href="/" className="brand"><img className="brand-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></Link><div className="user-pill">Creator <span>100 kredit</span></div></nav>
      <section className="dash-main">
        <div className="dash-head"><div><div className="eyebrow">WORKSPACE CREATOR</div><h1>Selamat datang kembali.</h1><p>Semua proses pembuatan video YouTube Anda ada di satu tempat.</p></div><Link href="/create" className="primary"><Sparkles size={17}/> Buat Video Baru <ArrowRight size={17}/></Link></div>
        <div className="stats"><Stat icon={<WalletCards/>} label="Kredit tersedia" value="100"/><Stat icon={<Clapperboard/>} label="Total project" value="3"/><Stat icon={<FolderOpen/>} label="Video selesai" value="0"/></div>
        <div className="project-box"><div className="box-title"><div><div className="eyebrow">PROJECT TERBARU</div><h2>Riwayat video</h2></div><Link href="/projects">Lihat semua <ArrowRight size={15}/></Link></div><div className="project-list">{projects.map((p) => <div className="project" key={p.title}><div className="project-icon"><Clapperboard size={18}/></div><div className="project-info"><strong>{p.title}</strong><span>{p.duration}</span></div><span className="status">{p.status}</span><ArrowRight size={17} className="row-arrow"/></div>)}</div></div>
      </section>
    </main>
  );
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
