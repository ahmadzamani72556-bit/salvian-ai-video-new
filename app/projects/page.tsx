"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clapperboard, Search } from "lucide-react";
import { useMemo, useState } from "react";

const projects = [
  { title: "Belajar Membuat Channel YouTube", status: "Draft", duration: "7 menit", date: "Hari ini" },
  { title: "Rahasia Rezeki dalam Kehidupan", status: "Siap diedit", duration: "8 menit", date: "Kemarin" },
  { title: "Tips Creator Pemula 2026", status: "Diproses", duration: "5 menit", date: "2 hari lalu" },
];

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => projects.filter(p => p.title.toLowerCase().includes(query.toLowerCase())), [query]);
  return <main className="dash-shell"><nav className="dash-nav"><Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link><span className="user-pill">Saldo Creator</span></nav><section className="dash-main"><Link href="/dashboard" className="back"><ArrowLeft size={16}/> Dashboard</Link><div className="dash-head"><div><div className="eyebrow">PROJECT LIBRARY</div><h1>Semua project.</h1><p>Kelola dan lanjutkan semua video yang pernah Anda buat.</p></div><Link href="/create" className="primary">Buat Video Baru <ArrowRight size={17}/></Link></div><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari project..." /></div><div className="project-box"><div className="project-list">{filtered.map(p=><Link href="/workspace" className="project" key={p.title}><div className="project-icon"><Clapperboard size={18}/></div><div className="project-info"><strong>{p.title}</strong><span>{p.duration} · {p.date}</span></div><span className="status">{p.status}</span><ArrowRight size={17} className="row-arrow"/></Link>)}{!filtered.length && <div className="empty-state">Project tidak ditemukan.</div>}</div></div></section></main>;
}
