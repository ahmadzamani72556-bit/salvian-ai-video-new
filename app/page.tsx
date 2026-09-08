"use client";

import { useState } from 'react';
import { ArrowRight, Check, Clapperboard, Clock3, Sparkles, Wand2 } from 'lucide-react';

const durations = [5, 6, 7, 8];
const CREATOR_ACCOUNT = 'https://salvian-ai-creator.vercel.app/akun.html?from=video';

export default function Home() {
  const [duration, setDuration] = useState(7);
  const [topic, setTopic] = useState('');
  const [started, setStarted] = useState(false);

  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></div>
        <div className="nav-links"><a href="#fitur">Fitur</a><a href="#harga">Harga</a><button className="login" onClick={() => window.location.href = CREATOR_ACCOUNT}>Masuk</button><button className="nav-cta" onClick={() => window.location.href = CREATOR_ACCOUNT}>Mulai Gratis</button></div>
      </nav>

      <section className="hero">
        <div className="badge"><Sparkles size={15}/> AI Video Creator untuk YouTube</div>
        <h1>Dari <span>ide</span> menjadi<br/>video YouTube.</h1>
        <p className="hero-copy">Tulis satu topik. SALVIAN AI VIDEO membantu membuat skrip, voice-over, visual, subtitle, hingga video siap dipublikasikan.</p>
        <div className="creator-card">
          <div className="card-head"><div><small>BUAT VIDEO BARU</small><h2>Mulai dari ide Anda</h2></div><div className="credits">100 Kredit Gratis</div></div>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="Contoh: Rahasia sukses channel YouTube untuk pemula..." />
          <div className="options">
            <div className="duration"><Clock3 size={17}/><span>Durasi</span>{durations.map(d => <button key={d} className={duration === d ? 'selected' : ''} onClick={() => setDuration(d)}>{d} mnt</button>)}</div>
            <button className="generate" onClick={() => setStarted(true)}><Wand2 size={18}/> {started ? 'Proses dimulai...' : 'Buat Video'} <ArrowRight size={18}/></button>
          </div>
        </div>
        <div className="trust"><Check size={15}/> Tanpa kartu kredit &nbsp; • &nbsp; Hasil dapat diedit &nbsp; • &nbsp; MP4 siap upload</div>
      </section>

      <section id="fitur" className="features">
        <div className="section-label">SATU ALUR, SEMUA OTOMATIS</div><h2>Creator cukup fokus pada <span>ide.</span></h2>
        <div className="feature-grid">
          <Feature icon="01" title="AI Script" text="Skrip terstruktur sesuai topik, durasi, dan gaya channel." />
          <Feature icon="02" title="Voice & Visual" text="Voice-over dan scene visual disiapkan untuk setiap bagian video." />
          <Feature icon="03" title="Subtitle & Render" text="Subtitle, preview, dan video final dalam satu alur." />
        </div>
      </section>

      <section id="harga" className="pricing"><div><div className="section-label">MULAI GRATIS</div><h2>Bangun lebih banyak.<br/><span>Bayar saat berkembang.</span></h2></div><div className="price-card"><small>FREE</small><strong>100</strong><span>kredit awal</span><button onClick={() => window.location.href = CREATOR_ACCOUNT}>Mulai Membuat <ArrowRight size={17}/></button></div><div className="price-card premium"><small>PREMIUM</small><strong>Lebih banyak</strong><span>untuk creator aktif</span><button onClick={() => window.location.href = CREATOR_ACCOUNT}>Lihat Paket <ArrowRight size={17}/></button></div></section>

      <footer><div className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></div><span>© 2026 SALVIAN AI VIDEO</span></footer>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="feature"><div className="feature-icon"><Clapperboard size={19}/><small>{icon}</small></div><h3>{title}</h3><p>{text}</p></div>;
}
