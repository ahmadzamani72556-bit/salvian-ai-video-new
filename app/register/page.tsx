'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, Sparkles, UserRound } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem('salvian_demo_user', email.trim());
    window.location.href = '/dashboard';
  }

  return <main className="auth-page"><div className="auth-card"><div className="brand-mark"><Sparkles size={18}/> SALVIAN AI VIDEO</div><h1>Mulai membuat video</h1><p className="muted">Akun gratis langsung mendapat 100 kredit untuk mencoba workflow creator.</p><form onSubmit={submit}><label>Nama creator</label><div className="input-wrap"><UserRound size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama Anda" required /></div><label>Email</label><div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" required /></div><label>Password</label><div className="input-wrap"><input type="password" minLength={6} placeholder="Minimal 6 karakter" required /></div><button className="primary-btn" type="submit">Buat akun <ArrowRight size={17}/></button></form><p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk</Link></p><Link className="back-link" href="/">← Kembali ke beranda</Link></div></main>;
}
