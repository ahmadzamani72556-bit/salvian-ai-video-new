'use client';

import Link from 'next/link';
import { ArrowRight, Mail, UserRound } from 'lucide-react';

const CREATOR_ACCOUNT_URL = 'https://salvian-ai-creator.vercel.app/akun.html?from=video';

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><img className="auth-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></div>
        <h1>Daftar akun creator</h1>
        <p className="muted">Pendaftaran dilakukan satu kali di SALVIAN AI CREATOR. Setelah selesai, Anda otomatis kembali ke SALVIAN AI VIDEO.</p>
        <div style={{display:'grid',gap:12,marginTop:20}}>
          <a className="primary-btn" href={CREATOR_ACCOUNT_URL}>Daftar / Masuk Akun SALVIAN <ArrowRight size={17}/></a>
          <div className="input-wrap"><UserRound size={17}/><input placeholder="Nama dikelola di SALVIAN AI CREATOR" disabled /></div>
          <div className="input-wrap"><Mail size={17}/><input type="email" placeholder="Email dikelola di SALVIAN AI CREATOR" disabled /></div>
        </div>
        <p className="auth-switch">Sudah punya akun? <Link href="/login?from=video">Masuk</Link></p>
        <Link className="back-link" href="/">← Kembali ke beranda</Link>
      </div>
    </main>
  );
}
