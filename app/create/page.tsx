"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, Sparkles } from "lucide-react";
import { useState } from "react";

export default function CreatePage() {
  const [duration, setDuration] = useState(7);
  const [topic, setTopic] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return <main className="create-shell"><nav className="dash-nav"><Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link><span className="user-pill">100 kredit</span></nav><section className="create-main"><Link href="/dashboard" className="back"><ArrowLeft size={16}/> Dashboard</Link><div className="create-title"><div className="eyebrow">CREATE VIDEO</div><h1>Ubah ide menjadi video.</h1><p>Isi topik utama. SALVIAN AI VIDEO akan menyiapkan struktur video untuk Anda.</p></div><div className="form-card"><label>TOPIK VIDEO</label><textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: 7 rahasia agar channel YouTube baru cepat berkembang..."/><label>DURASI VIDEO</label><div className="duration-grid">{[5,6,7,8].map(d=><button key={d} className={duration===d?'active':''} onClick={()=>setDuration(d)}><Clock3 size={17}/><strong>{d} menit</strong><span>{d===5?'Ringkas':d===8?'Mendalam':'Standar'}</span></button>)}</div><div className="form-footer"><span><Sparkles size={16}/> Perkiraan: 25 kredit</span><button className="primary" disabled={!topic.trim()} onClick={()=>setSubmitted(true)}>{submitted?'Menyiapkan project...':'Lanjutkan'} <ArrowRight size={17}/></button></div></div></section></main>;
}
