import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';

const CREATOR_ACCOUNT_URL = 'https://salvian-ai-creator.vercel.app/akun.html?from=video';
const CREATOR_PAYMENT_URL = 'https://salvian-ai-creator.vercel.app/modules/payment/products.html';

const plans = [
  {
    name: 'Free',
    price: 'Gratis',
    credit: 'Saldo dikelola di Creator',
    items: ['Video 5 menit', 'AI script dasar', 'Preview workflow', 'Project history']
  },
  {
    name: 'Premium',
    price: 'Melalui Creator',
    credit: 'Paket & kredit terpusat',
    items: ['Video 5–8 menit', 'AI script lengkap', 'Voice-over & scene plan', 'Subtitle otomatis', 'Thumbnail & SEO YouTube', 'Prioritas render']
  }
];

export default function PricingPage() {
  return (
    <main className="pricing-page">
      <header className="simple-nav">
        <Link href="/" className="brand-mark"><Sparkles size={18}/> SALVIAN AI VIDEO</Link>
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
      </header>
      <section className="pricing-hero">
        <span className="eyebrow">PRICING</span>
        <h1>Pilih paket untuk produksi lebih cepat.</h1>
        <p>Mulai gratis. Akun, paket, dan saldo kredit Anda dikelola terpusat melalui SALVIAN AI CREATOR.</p>
        <div className="plan-grid">
          {plans.map(p => (
            <article className={'plan-card '+(p.name==='Premium'?'featured':'')} key={p.name}>
              {p.name==='Premium'&&<span className="plan-badge">TERHUBUNG KE CREATOR</span>}
              <h2>{p.name}</h2>
              <div className="plan-price">{p.price}</div>
              <strong>{p.credit}</strong>
              <ul>{p.items.map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul>
              <a
                className={p.name==='Premium'?'primary-btn':'secondary-btn'}
                href={p.name==='Premium'?CREATOR_PAYMENT_URL:CREATOR_ACCOUNT_URL}
              >
                {p.name==='Premium'?'💳 Kelola Paket di Creator':'👤 Kelola Akun di Creator'}
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
