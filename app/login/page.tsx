'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setMessage('Masukkan email terlebih dahulu.');
    localStorage.setItem('salvian_demo_user', email.trim());
    window.location.href = '/dashboard';
  }

  return <main className="auth-page"><div className="auth-card"><div className="brand-mark"><Sparkles size={18}/> SALVIAN AI VIDEO</div><h1>Selamat datang kembali</h1><p className="muted">Masuk ke workspace creator Anda dan lanjutkan produksi video.</p><form onSubmit={submit}><label>Email</label><div className="input-wrap"><Mail size={17}/><input type="email" placeholder="nama@email.com" value={email} onChange={e=>setEmail(e.target.value)} required /></div><label>Password</label><div className="input-wrap"><LockKeyhole size={17}/><input type="password" placeholder="••••••••" required /></div><button className="primary-btn" type="submit">Masuk <ArrowRight size={17}/></button></form>{message && <p className="form-message">{message}</p>}<p className="auth-switch">Belum punya akun? <Link href="/register">Daftar gratis</Link></p><Link className="back-link" href="/">← Kembali ke beranda</Link></div></main>;
}
