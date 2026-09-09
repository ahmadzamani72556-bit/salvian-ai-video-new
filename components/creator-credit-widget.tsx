'use client';

import { RefreshCw, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';

const CREATOR_ORIGIN = 'https://salvian-ai-creator.vercel.app';
const CREATOR_ACCOUNT = `${CREATOR_ORIGIN}/akun.html?from=video&bridge=1`;
const PROFILE_KEY = 'salvian-video-account-profile';

type Profile = { display_name?: string; email?: string; plan?: string; credits?: number };

export default function CreatorCreditWidget() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {}

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== CREATOR_ORIGIN || event.data?.type !== 'SALVIAN_ACCOUNT_PROFILE') return;
      const next = event.data?.profile as Profile | undefined;
      if (!next) return;
      setProfile(next);
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
      setBusy(false);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function syncCredits() {
    setBusy(true);
    const popup = window.open(CREATOR_ACCOUNT, 'salvianCreatorAccount', 'popup,width=520,height=820,resizable=yes,scrollbars=yes');
    if (!popup) {
      setBusy(false);
      window.location.href = '/account';
    }
  }

  const credits = profile ? Number(profile.credits || 0).toLocaleString('id-ID') : null;
  const plan = profile?.plan || null;

  return (
    <button type="button" onClick={syncCredits} disabled={busy} aria-label="Hubungkan dan sinkronkan saldo Creator"
      style={{ display:'inline-flex', alignItems:'center', gap:8, border:'1px solid #294260', background:'#071321', color:'#eef5ff', borderRadius:12, padding:'9px 12px', cursor:busy?'wait':'pointer', font:'inherit', boxShadow:'0 8px 24px #0005' }}>
      <WalletCards size={16} />
      <span style={{display:'grid', textAlign:'left', lineHeight:1.15}}>
        <strong style={{fontSize:12}}>{credits === null ? 'Hubungkan Creator' : `${credits} kredit`}</strong>
        <small style={{fontSize:10, color:'#8fa2bd'}}>{busy ? 'Menyinkronkan…' : plan || 'Klik untuk login & sinkronkan saldo'}</small>
      </span>
      <RefreshCw size={13} style={{opacity:.75}} />
    </button>
  );
}
