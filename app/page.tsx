import Link from 'next/link';
import { ArrowRight, Check, Clapperboard, Clock3, Layers3, Sparkles, Wand2 } from 'lucide-react';

const durations = [5, 6, 7, 8];

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand"><img className="brand-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></Link>
        <div className="nav-links"><a href="#fitur">Fitur</a><a href="#alur">Alur</a><Link className="login" href="/login">Masuk</Link><Link className="nav-cta" href="/create">Mulai Gratis</Link></div>
      </nav>
      <section className="hero">
        <div className="badge"><Sparkles size={15}/> LONG VIDEO CREATION STUDIO</div>
        <h1>Dari <span>ide</span> menjadi<br/>video YouTube.</h1>
        <p className="hero-copy">Satu studio untuk membuat video panjang 5–8 menit: skrip, storyboard, voice-over, visual, musik, subtitle, editing, sampai render MP4.</p>
        <div className="creator-card">
          <div className="card-head"><div><small>BUAT VIDEO BARU</small><h2>Mulai dari ide Anda</h2></div><div className="credits">Studio siap digunakan</div></div>
          <div className="idea-preview"><Wand2 size={18}/><span>Tulis topik atau konsep video yang ingin dibuat...</span></div>
          <div className="options"><div className="duration"><Clock3 size={17}/><span>Durasi produksi</span>{durations.map(d => <span className="duration-chip" key={d}>{d} mnt</span>)}</div><Link className="generate" href="/create"><Wand2 size={18}/> Buat Video <ArrowRight size={18}/></Link></div>
        </div>
        <div className="trust"><Check size={15}/> Output 5–8 menit &nbsp; • &nbsp; 16:9 / 9:16 / 1:1 &nbsp; • &nbsp; MP4 siap render</div>
      </section>
      <section id="fitur" className="features"><div className="section-label">STUDIO PRODUKSI LENGKAP</div><h2>Satu alur dari <span>ide sampai video.</span></h2><div className="feature-grid"><Feature icon="01" title="Script & Storyboard" text="Bangun naskah panjang dan pecah otomatis menjadi scene yang runtut." /><Feature icon="02" title="Voice, Visual & Music" text="Siapkan narasi, visual scene, ambience, dan musik dengan kontrol kreator." /><Feature icon="03" title="Subtitle & Timeline" text="Atur subtitle, durasi scene, transisi, layer audio, dan preview sebelum render." /></div></section>
      <section id="alur" className="pipeline-section"><div><div className="section-label">PRODUCTION PIPELINE</div><h2>Lima tahap. <span>Satu video final.</span></h2></div><div className="pipeline"><Pipe n="01" icon={<Sparkles size={18}/>} title="Idea → Script"/><Pipe n="02" icon={<Layers3 size={18}/>} title="Storyboard → Scene"/><Pipe n="03" icon={<Clapperboard size={18}/>} title="Voice → Visual"/><Pipe n="04" icon={<Clock3 size={18}/>} title="Subtitle → Edit"/><Pipe n="05" icon={<Check size={18}/>} title="Render → MP4"/></div></section>
      <footer><Link href="/" className="brand"><img className="brand-logo footer-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></Link><span>© 2026 SALVIAN AI VIDEO · Long Video Creation Studio</span></footer>
    </main>
  );
}
function Feature({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="feature"><div className="feature-icon"><Clapperboard size={19}/><small>{icon}</small></div><h3>{title}</h3><p>{text}</p></div>; }
function Pipe({ n, icon, title }: { n: string; icon: React.ReactNode; title: string }) { return <div className="pipe"><span>{n}</span><div>{icon}</div><strong>{title}</strong></div>; }
