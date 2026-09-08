"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Film, Image, Loader2, Mic2, Music2, Palette, Play, Save, Sparkles, Subtitles, WandSparkles } from "lucide-react";
import { useState } from "react";

type Project={title:string;duration:number;status:string;hook?:string;script?:string;scenes?:{number:number;title:string;visual:string;duration:number}[];voice?:{status:string;style:string};render?:{status:string;format:string;resolution:string};seo?:{title:string;description:string;tags:string[]}};
const stages=[['Script AI',WandSparkles],['Storyboard',Palette],['Voice-over',Mic2],['Visual',Image],['Music',Music2],['Subtitle',Subtitles],['Render',Film]] as const;
const durations=[5,6,7,8];

export default function CreatePage(){
 const [duration,setDuration]=useState(7),[topic,setTopic]=useState(''),[style,setStyle]=useState('Cinematic'),[ratio,setRatio]=useState('16:9'),[language,setLanguage]=useState('Indonesia'),[voice,setVoice]=useState('Narator Natural'),[music,setMusic]=useState('Ambient Cinematic'),[loading,setLoading]=useState(false),[result,setResult]=useState<Project|null>(null),[error,setError]=useState(''),[activeTab,setActiveTab]=useState('Konsep');
 async function generate(){setLoading(true);setError('');setResult(null);try{const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,duration,style,ratio,language,voice,music})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Gagal membuat project.');setResult(data.project)}catch(e){setError(e instanceof Error?e.message:'Terjadi kesalahan.')}finally{setLoading(false)}}
 return <main className="create-shell">
  <nav className="dash-nav"><Link href="/" className="brand"><span className="brand-mark">S</span><span>SALVIAN <b>AI VIDEO</b></span></Link><div className="studio-nav-actions"><span className="user-pill">2.500 kredit</span><Link href="/dashboard" className="secondary-btn">Dashboard</Link></div></nav>
  <section className="create-main">
   <Link href="/dashboard" className="back"><ArrowLeft size={16}/> Dashboard</Link>
   <div className="studio-title"><div><div className="eyebrow">VIDEO STUDIO · LONG FORM</div><h1>Produksi video 5–8 menit.</h1><p>Bangun video dari konsep sampai render. Semua kontrol utama sudah disiapkan; mesin produksi akan diaktifkan bertahap.</p></div><button className="secondary-btn" type="button"><Save size={16}/> Simpan Draft</button></div>
   <div className="stage-strip studio-stages">{stages.map(([name,Icon],i)=><div className="stage" key={name}><span>{i+1}</span><Icon size={15}/><b>{name}</b></div>)}</div>
   <div className="studio-layout"><div className="studio-editor">
    <div className="tab-bar">{['Konsep','Script','Storyboard','Audio','Visual','Subtitle','Timeline'].map(t=><button type="button" key={t} className={activeTab===t?'tab-active':''} onClick={()=>setActiveTab(t)}>{t}</button>)}</div>
    <div className="form-card studio-card">
     <div className="section-heading"><div><div className="eyebrow">01 · WORKSPACE</div><h2>{activeTab}</h2></div><span className="ready-pill"><CheckCircle2 size={14}/> UI siap</span></div>
     <label>IDE / TOPIK VIDEO</label><textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: Rahasia zikir qolbi dan perjalanan batin seorang pencari makrifat..." disabled={loading}/>
     <div className="control-grid">
      <Control label="DURASI"><div className="choice-row">{durations.map(d=><button type="button" key={d} className={duration===d?'choice-active':''} onClick={()=>setDuration(d)} disabled={loading}><Clock3 size={14}/>{d} mnt</button>)}</div></Control>
      <Control label="RASIO"><div className="choice-row">{['16:9','9:16','1:1'].map(x=><button type="button" key={x} className={ratio===x?'choice-active':''} onClick={()=>setRatio(x)}>{x}</button>)}</div></Control>
      <Control label="GAYA VISUAL"><select value={style} onChange={e=>setStyle(e.target.value)}><option>Cinematic</option><option>Documentary</option><option>Realistic</option><option>Anime</option><option>Islamic Elegant</option></select></Control>
      <Control label="BAHASA"><select value={language} onChange={e=>setLanguage(e.target.value)}><option>Indonesia</option><option>English</option><option>Malay</option></select></Control>
      <Control label="VOICE-OVER"><select value={voice} onChange={e=>setVoice(e.target.value)}><option>Narator Natural</option><option>Narator Deep</option><option>Narator Warm</option><option>Storytelling</option></select></Control>
      <Control label="MUSIK LATAR"><select value={music} onChange={e=>setMusic(e.target.value)}><option>Ambient Cinematic</option><option>Emotional Piano</option><option>Documentary</option><option>Minimal</option><option>Tanpa Musik</option></select></Control>
     </div>
     <div className="feature-switches"><Toggle title="Auto Storyboard" text="Pecah naskah menjadi scene otomatis"/><Toggle title="Auto Subtitle" text="Sinkronkan subtitle dengan voice-over"/><Toggle title="Smart Pacing" text="Sesuaikan tempo antar scene"/></div>
     {error&&<div className="error-box">{error}</div>}{result&&<Result project={result}/>} 
     <div className="form-footer studio-footer"><span><Sparkles size={16}/> Estimasi awal: 25 kredit · {duration} menit · {ratio}</span><button className="primary" disabled={!topic.trim()||loading} onClick={generate}>{loading?<><Loader2 size={17} className="spin"/> Menyiapkan project...</>:<>Buat Project <ArrowRight size={17}/></>}</button></div>
    </div>
   </div>
   <aside className="preview-panel"><div className="preview-head"><div><div className="eyebrow">LIVE PREVIEW</div><strong>Canvas {ratio}</strong></div><span className="preview-dot">READY</span></div><div className="video-preview"><div className="preview-grid"></div><div className="preview-center"><Play size={22}/></div><span>Preview video akan muncul di sini</span></div><div className="preview-meta"><div><span>SCENE</span><strong>{result?.scenes?.length||0}</strong></div><div><span>DURASI</span><strong>{duration}:00</strong></div><div><span>OUTPUT</span><strong>MP4</strong></div></div><button className="secondary-btn full" type="button"><Play size={15}/> Preview Timeline</button></aside>
   </div>
  </section>
 </main>;
}
function Control({label,children}:{label:string;children:React.ReactNode}){return <div className="control"><label>{label}</label>{children}</div>}
function Toggle({title,text}:{title:string;text:string}){return <div className="toggle"><div><strong>{title}</strong><span>{text}</span></div><div className="toggle-ui"></div></div>}
function Result({project}:{project:Project}){return <div className="result-card"><div className="result-head"><div><div className="eyebrow">PROJECT READY</div><h2>{project.title}</h2><p>{project.status} · {project.duration} menit</p></div><CheckCircle2 size={28}/></div><div className="result-grid"><article><span>HOOK</span><p>{project.hook}</p></article><article><span>VOICE</span><p>{project.voice?.style||'Narator Indonesia natural'}</p></article><article><span>RENDER</span><p>{project.render?.format||'MP4'} · {project.render?.resolution||'1080p'} · {project.render?.status||'queued'}</p></article></div>{project.script&&<article className="script-preview"><span>NASKAH</span><p>{project.script}</p></article>}{project.scenes&&<div className="scene-list">{project.scenes.slice(0,8).map(s=><div className="scene-item" key={s.number}><b>{s.number}</b><div><strong>{s.title}</strong><p>{s.visual}</p></div><small>{s.duration}s</small></div>)}</div>}<div className="seo-box"><span>YOUTUBE SEO</span><strong>{project.seo?.title||project.title}</strong><p>{project.seo?.description}</p><small>{project.seo?.tags?.join(' · ')}</small></div></div>}
