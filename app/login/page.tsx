'use client';

import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import Link from 'next/link';
import { openCreatorAccountAndReturn } from '../../lib/creator-bridge';

export default function LoginPage(){
  return <main className="auth-page">
    <div className="auth-card">
      <div className="auth-brand"><img className="auth-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></div>
      <h1>Masuk ke akun creator</h1>
      <p className="muted">Akun SALVIAN dikelola terpusat. Ketuk tombol di bawah untuk masuk melalui SALVIAN AI CREATOR. Setelah selesai, tutup jendela Creator dan Anda kembali ke SALVIAN AI VIDEO.</p>
      <div style={{display:'grid',gap:12,marginTop:20}}>
        <button className="primary-btn" type="button" onClick={()=>openCreatorAccountAndReturn('/create')}><span>Masuk / Kelola Akun di SALVIAN AI CREATOR</span><ArrowRight size={17}/></button>
        <div className="input-wrap"><Mail size={17}/><input type="email" placeholder="Email dikelola di SALVIAN AI CREATOR" disabled /></div>
        <div className="input-wrap"><LockKeyhole size={17}/><input type="password" placeholder="Password dikelola di SALVIAN AI CREATOR" disabled /></div>
      </div>
      <p className="auth-switch">Belum punya akun? <Link href="/register?from=video">Daftar gratis</Link></p>
      <Link className="back-link" href="/">← Kembali ke beranda</Link>
    </div>
  </main>;
}
