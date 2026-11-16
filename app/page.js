import Link from 'next/link';
import { PACKS, PRO, QUALITY, money } from '@/lib/pricing';

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF2D95" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function Feature({ children }) {
  return (
    <li style={{ display: 'flex', gap: 10 }}>
      <Check />
      <span>{children}</span>
    </li>
  );
}

export default function Home() {
  const listStyle = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 };
  return (
    <>
      <header className="topbar">
        <div className="wrap" style={{ justifyContent: 'space-between' }}>
          <span className="brand"><img src="/logo-white.png" alt="Ironik Grafix" style={{ height: 28, width: "auto", display: "block" }} /></span>
          <Link className="btn" href="/login">Client login</Link>
        </div>
      </header>

      <main className="wrap" style={{ padding: '72px 24px 80px', display: 'flex', flexDirection: 'column', gap: 64 }}>
        <section style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)' }}>AI STUDIO</span>
          <h1 style={{ fontSize: 'clamp(34px, 6vw, 52px)', lineHeight: 1.08 }}>
            Create your own graphic elements, in your brand, whenever you need them.
          </h1>
          <p style={{ margin: 0, fontSize: 18, color: '#c9c7ce' }}>
            Describe it, get 4 options, download the one you love — or send it to Ironik Grafix for a pro refine.
          </p>
        </section>

        <section aria-label="Plans" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 24 }}>Free</h2>
              <p className="muted" style={{ margin: '4px 0 0' }}>Buy images only when you need them.</p>
            </div>
            <div><span style={{ font: '700 48px var(--display)' }}>$0</span> <span className="muted">/ month</span></div>
            <ul style={listStyle}>
              <Feature>AI Studio account and saved gallery</Feature>
              <Feature>Buy 1 image or image packs any time</Feature>
              <Feature>Your brand colors built into every prompt</Feature>
            </ul>
            <Link className="btn btn-lg" href="/login" style={{ marginTop: 'auto', borderColor: 'var(--text)' }}>Create free account</Link>
          </div>

          <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, background: '#1A0A13', border: '2px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 24 }}>Pro</h2>
                <p style={{ margin: '4px 0 0', color: '#c9c7ce' }}>For brands that create every month.</p>
              </div>
              <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--accent)', color: '#000000' }}>Most popular</span>
            </div>
            <div><span style={{ font: '700 48px var(--display)' }}>{money(PRO.cents)}</span> <span style={{ color: '#c9c7ce' }}>/ month</span></div>
            <ul style={listStyle}>
              <Feature>Everything in Free</Feature>
              <Feature><strong>{PRO.monthlyCredits} AI credits</strong> every month — {Math.floor(PRO.monthlyCredits / QUALITY.standard.credits)} Standard images</Feature>
              <Feature>Cancel any time</Feature>
            </ul>
            <Link className="btn btn-primary btn-lg" href="/login" style={{ marginTop: 'auto' }}>Go Pro</Link>
          </div>
        </section>

        <section aria-labelledby="how" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 id="how" style={{ fontSize: 28 }}>How credits work</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {Object.values(QUALITY).map((q) => (
              <div className="card" key={q.label}>
                <div style={{ font: '600 18px var(--display)' }}>{q.label} · {q.credits} {q.credits === 1 ? 'credit' : 'credits'}</div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>{q.note}. 4 options per image.</p>
              </div>
            ))}
            <div className="card">
              <div style={{ font: '600 18px var(--display)' }}>Image packs</div>
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
                {Object.values(PACKS).map((p) => `${p.label} ${money(p.cents)}`).join(' · ')}. Packs never expire.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
