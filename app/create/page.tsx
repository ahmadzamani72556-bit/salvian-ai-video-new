"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

export default function CreatePage() {
  const [duration, setDuration] = useState(7);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; message?: string; output?: string } | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, duration }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat project.");
      setResult(data.project);
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
    finally { setLoading(false); }
  }

  return <main className="create-shell"><nav className="dash-nav"><Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link><span className="user-pill">100 kredit</span></nav><section className="create-main"><Link href="/dashboard" className="back"><ArrowLeft size={16}/> Dashboard</Link><div className="create-title"><div className="eyebrow">CREATE VIDEO</div><h1>Ubah ide menjadi video.</h1><p>Isi topik utama. SALVIAN AI VIDEO akan menyiapkan struktur video untuk Anda.</p></div><div className="form-card"><label>TOPIK VIDEO</label><textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: 7 rahasia agar channel YouTube baru cepat berkembang..." disabled={loading}/><label>DURASI VIDEO</label><div className="duration-grid">{[5,6,7,8].map(d=><button type="button" key={d} className={duration===d?'active':''} onClick={()=>setDuration(d)} disabled={loading}><Clock3 size={17}/><strong>{d} menit</strong><span>{d===5?'Ringkas':d===8?'Mendalam':'Standar'}</span></button>)}</div>{error && <div className="error-box">{error}</div>}{result && <div className="success-box"><CheckCircle2 size={20}/><div><strong>Project berhasil dibuat</strong><p>{result.message || "Outline AI sudah siap dikembangkan."}</p>{result.output && <pre>{result.output}</pre>}</div></div>}<div className="form-footer"><span><Sparkles size={16}/> Perkiraan: 25 kredit</span><button className="primary" disabled={!topic.trim() || loading} onClick={generate}>{loading ? <><Loader2 size={17} className="spin"/> Membuat...</> : <>Buat Project <ArrowRight size={17}/></>}</button></div></div></section></main>;
}
