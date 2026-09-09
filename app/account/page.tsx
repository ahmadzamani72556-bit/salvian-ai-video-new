"use client";

import { ArrowLeft, ExternalLink, RefreshCw, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const CREATOR = "https://salvian-ai-creator.vercel.app/akun.html?from=video&bridge=1";
const PROFILE_KEY = "salvian-video-account-profile";
type Profile = { display_name: string; email: string; plan: string; credits: number };

function readCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    return { display_name: String(p.display_name || "Pengguna Salvian"), email: String(p.email || ""), plan: String(p.plan || "FREE"), credits: Number(p.credits || 0) };
  } catch { return null; }
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const cached = readCachedProfile();
    if (cached) setProfile(cached);

    const handler = (event: MessageEvent) => {
      if (event.origin !== "https://salvian-ai-creator.vercel.app") return;
      if (event.data?.type !== "SALVIAN_ACCOUNT_PROFILE" || event.data?.source !== "creator") return;
      const p = event.data.profile;
      if (!p) return;
      const next: Profile = { display_name: String(p.display_name || "Pengguna Salvian"), email: String(p.email || ""), plan: String(p.plan || "FREE"), credits: Number(p.credits || 0) };
      setProfile(next);
      setOpened(true);
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PROFILE_KEY) return;
      const next = readCachedProfile();
      if (next) setProfile(next);
    };
    window.addEventListener("message", handler);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("message", handler);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const openCreator = () => {
    setOpened(true);
    window.open(CREATOR, "salvianCreatorAccount", "popup,width=520,height=820,resizable=yes,scrollbars=yes");
  };

  return (
    <main className="auth-page">
      <div className="auth-card" style={{ maxWidth: 620 }}>
        <div className="auth-brand"><img className="auth-logo" src="/salvian-ai-video-logo.svg" alt="Salvian AI Video" /><span>SALVIAN <b>AI VIDEO</b></span></div>
        <h1>Akun & saldo Creator</h1>
        <p className="muted">Akun dan kredit dikelola terpusat oleh SALVIAN AI CREATOR. Halaman ini menerima profil dan saldo dari Creator melalui bridge yang aman.</p>

        <div style={{display:"grid",gap:12,marginTop:20}}>
          {profile ? (
            <div style={{border:"1px solid #294260",borderRadius:20,padding:18,background:"#071321"}}>
              <div style={{fontSize:12,color:"#8fa2bd"}}>AKUN AKTIF</div>
              <div style={{fontSize:24,fontWeight:900,marginTop:5}}>{profile.display_name}</div>
              <div style={{color:"#8fa2bd",marginTop:4}}>{profile.email}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
                <div style={{padding:14,borderRadius:15,background:"#0b1a2d"}}><div style={{fontSize:12,color:"#8fa2bd"}}>Paket</div><strong>{profile.plan}</strong></div>
                <div style={{padding:14,borderRadius:15,background:"#0b1a2d"}}><div style={{fontSize:12,color:"#8fa2bd"}}>Kredit</div><strong>{Number(profile.credits || 0).toLocaleString("id-ID")}</strong></div>
              </div>
            </div>
          ) : (
            <div style={{border:"1px dashed #294260",borderRadius:20,padding:22,textAlign:"center",color:"#8fa2bd"}}><WalletCards size={28} style={{margin:"0 auto 10px"}}/><strong style={{display:"block",color:"#fff"}}>Belum terhubung</strong><span>Buka akun Creator untuk login dan melihat saldo server.</span></div>
          )}
          <button className="primary-btn" onClick={openCreator}><ExternalLink size={17}/> {profile ? "Buka Creator & perbarui saldo" : "Masuk / Kelola Akun di Creator"}</button>
          {opened && <div style={{fontSize:12,color:"#8fa2bd",textAlign:"center"}}><RefreshCw size={13} style={{verticalAlign:"-2px",marginRight:5}}/> Saldo akan diperbarui otomatis setelah Creator mengirim profil terbaru.</div>}
          <Link className="back-link" href="/dashboard"><ArrowLeft size={15}/> Kembali ke Dashboard</Link>
        </div>

        <div style={{marginTop:20,padding:14,borderRadius:16,background:"#0a1425",border:"1px solid #294260",fontSize:12,lineHeight:1.6,color:"#8fa2bd"}}>
          <b style={{color:"#fff"}}>Catatan keamanan:</b> bridge hanya mengirim nama, email, paket, dan jumlah kredit. Password serta token autentikasi tidak dikirim melalui URL atau postMessage.
        </div>
      </div>
    </main>
  );
}
