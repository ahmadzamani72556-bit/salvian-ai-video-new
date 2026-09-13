'use client';

import { RefreshCw, WalletCards } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const CREATOR_ORIGIN = 'https://salvian-ai-creator.vercel.app';
const PROFILE_KEY = 'salvian-video-account-profile';

type Profile = { display_name?: string; email?: string; plan?: string; credits?: number };

function normalizeProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  const credits = Number(p.credits);
  return {
    display_name: typeof p.display_name === 'string' ? p.display_name : 'Pengguna Salvian',
    email: typeof p.email === 'string' ? p.email : '',
    plan: typeof p.plan === 'string' ? p.plan : 'FREE',
    credits: Number.isFinite(credits) ? Math.max(0, credits) : 0,
  };
}

export default function CreatorCreditWidget() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      const saved = raw ? normalizeProfile(JSON.parse(raw)) : null;
      if (saved) setProfile(saved);
    } catch {}

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== CREATOR_ORIGIN) return;
      const data = event.data;
      if (data?.type !== 'SALVIAN_ACCOUNT_PROFILE' && data?.type !== 'SALVIAN_ACCOUNT_AUTHENTICATED') return;
      const next = normalizeProfile(data.profile);
      if (!next) return;
      setProfile(next);
      setBusy(false);
      popupRef.current = null;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function syncCredits() {
    setBusy(true);
    const returnTo = window.location.href;
    const creatorUrl = new URL(`${CREATOR_ORIGIN}/akun.html`);
    creatorUrl.searchParams.set('from', 'video');
    creatorUrl.searchParams.set('bridge', '1');
    creatorUrl.searchParams.set('returnTo', returnTo);

    const popup = window.open(
      creatorUrl.toString(),
      'salvianCreatorAccount',
      'popup,width=520,height=820,resizable=yes,scrollbars=yes',
    );

    if (!popup) {
      setBusy(false);
      window.location.href = creatorUrl.toString();
      return;
    }

    popupRef.current = popup;

    // Also request the profile after opening. This covers the important case
    // where the Creator account was already logged in and no new login event
    // occurs to trigger the original profile message.
    const requestProfile = () => {
      try { popup.postMessage({ type: 'SALVIAN_REQUEST_ACCOUNT_PROFILE' }, CREATOR_ORIGIN); } catch {}
    };
    window.setTimeout(requestProfile, 700);
    window.setTimeout(requestProfile, 1500);
    window.setTimeout(requestProfile, 3000);
    window.setTimeout(requestProfile, 5000);

    pollRef.current = setInterval(() => {
      if (popup.closed) {
        setBusy(false);
        popupRef.current = null;
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    }, 500);

    timeoutRef.current = setTimeout(() => {
      setBusy(false);
      timeoutRef.current = null;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (popupRef.current?.closed) popupRef.current = null;
    }, 30000);
  }

  const credits = profile ? Number(profile.credits || 0).toLocaleString('id-ID') : null;
  const plan = profile?.plan || null;
  const label = credits === null ? 'Saldo Creator' : `${credits} kredit`;
  const sublabel = busy ? 'Menghubungkan…' : (plan || 'Ketuk untuk login & sinkronkan');

  return (
    <button
      type="button"
      onClick={syncCredits}
      disabled={busy}
      aria-label="Buka SALVIAN AI CREATOR untuk login dan sinkronkan saldo"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #294260', background: '#071321', color: '#eef5ff', borderRadius: 12, padding: '9px 12px', cursor: busy ? 'wait' : 'pointer', font: 'inherit', boxShadow: '0 8px 24px #0005' }}
    >
      <WalletCards size={16} />
      <span style={{ display: 'grid', textAlign: 'left', lineHeight: 1.15 }}>
        <strong style={{ fontSize: 12 }}>{label}</strong>
        <small style={{ fontSize: 10, color: credits === null ? '#ffcc70' : '#8fa2bd' }}>{sublabel}</small>
      </span>
      <RefreshCw size={13} style={{ opacity: 0.75 }} />
    </button>
  );
}
