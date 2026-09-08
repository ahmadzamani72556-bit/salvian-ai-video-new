'use client';

import { useSearchParams } from 'next/navigation';
import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const params = useSearchParams();
  const creatorUrl = 'https://salvian-ai-creator.vercel.app/akun.html?from=video';

  return <main className="auth-page"><div className="auth-card"><div className="brand-mark"><Sparkles size={18}/> SALVIAN AI VIDEO</div><h1>Masuk ke akun creator</h1><p className="muted">Akun SALVIAN dikelola terpusat. Masuk melalui SALVIAN AI CREATOR, lalu Anda akan dikembalikan ke SALVIAN AI VIDEO.</p><div style={{display:'grid',gap:12,marginTop:20}}><a className="primary-btn" href={creatorUrl}>Masuk / Kelola Akun <ArrowRight size={17}/></a><div className="input-wrap"><Mail size={17}/><input type="email" placeholder="Email dikelola di SALVIAN AI CREATOR" disabled /></div><div className="input-wrap"><LockKeyhole size={17}/><input type="password" placeholder="Password dikelola di SALVIAN AI CREATOR" disabled /></div></div><p className="auth-switch">Belum punya akun? <Link href="/register">Daftar gratis</Link></p><Link className="back-link" href="/">← Kembali ke beranda</Link></div></main>;
}
