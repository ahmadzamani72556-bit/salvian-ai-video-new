'use client';

import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import Link from 'next/link';

const CREATOR_ACCOUNT_URL = 'https://salvian-ai-creator.vercel.app/akun.html?from=video';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><img className="auth-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></div>
        <h1>Masuk ke akun creator</h1>
        <p className="muted">Akun SALVIAN dikelola terpusat. Masuk melalui SALVIAN AI CREATOR, lalu Anda akan dikembalikan ke SALVIAN AI VIDEO.</p>
        <div style={{display:'grid',gap:12,marginTop:20}}>
          <a className="primary-btn" href={CREATOR_ACCOUNT_URL}>Masuk / Kelola Akun <ArrowRight size={17}/></a>
          <div className="input-wrap"><Mail size={17}/><input type="email" placeholder="Email dikelola di SALVIAN AI CREATOR" disabled /></div>
          <div className="input-wrap"><LockKeyhole size={17}/><input type="password" placeholder="Password dikelola di SALVIAN AI CREATOR" disabled /></div>
        </div>
        <p className="auth-switch">Belum punya akun? <Link href="/register?from=video">Daftar gratis</Link></p>
        <Link className="back-link" href="/">← Kembali ke beranda</Link>
      </div>
    </main>
  );
}
