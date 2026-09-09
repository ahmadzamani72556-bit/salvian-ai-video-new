"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("SALVIAN AI VIDEO application error", error);
  }, [error]);

  return (
    <main className="auth-page">
      <div className="auth-card" style={{ maxWidth: 620, textAlign: "center" }}>
        <AlertTriangle size={42} style={{ margin: "0 auto 14px" }} />
        <h1>Terjadi gangguan</h1>
        <p className="muted">SALVIAN AI VIDEO tidak dapat menyelesaikan halaman ini. Project dan saldo Creator tidak dihapus.</p>
        {error.digest && <p className="muted" style={{ fontSize: 12 }}>Kode: {error.digest}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          <button className="primary-btn" type="button" onClick={() => reset()}><RefreshCw size={17} /> Coba Lagi</button>
          <Link className="secondary-btn" href="/"><Home size={17} /> Beranda</Link>
        </div>
      </div>
    </main>
  );
}
