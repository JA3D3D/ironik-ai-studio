'use client';

import { useCallback, useEffect, useState } from 'react';
import { KINDS, PACKS, PRO, QUALITY, money } from '@/lib/pricing';

const TABS = [
  ['create', 'Create'],
  ['gallery', 'My gallery'],
  ['credits', 'Credits'],
  ['account', 'Account'],
];

async function downloadImage(url, name) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

export default function Studio({ initialTab, purchase }) {
  const [tab, setTab] = useState(initialTab);
  const [profile, setProfile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState('logo');
  const [quality, setQuality] = useState('standard');
  const [useBrand, setUseBrand] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needCredits, setNeedCredits] = useState(false);
  const [results, setResults] = useState([]);
  const [gallery, setGallery] = useState(null);
  const [notice, setNotice] = useState('');
  const [busyItem, setBusyItem] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [brandColors, setBrandColors] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/me', { cache: 'no-store' });
    if (res.status === 401) {
      window.location.href = '/login';
      return null;
    }
    const { profile } = await res.json();
    setProfile(profile);
    return profile;
  }, []);

  useEffect(() => {
    loadProfile().then((p) => {
      if (p) {
        setBusinessName(p.business_name || '');
        setBrandColors(p.brand_colors || '');
      }
    });
  }, [loadProfile]);

  // After Stripe checkout, the webhook may take a few seconds to add credits.
  useEffect(() => {
    if (!purchase) return;
    setNotice(purchase === 'pro' ? 'Welcome to Pro! Your monthly credits are being added…' : 'Payment received. Adding your credits…');
    let tries = 0;
    let start = null;
    const timer = setInterval(async () => {
      tries += 1;
      const p = await loadProfile();
      if (p && start === null) start = p.credits;
      if ((p && start !== null && p.credits > start) || tries >= 8) {
        clearInterval(timer);
        setNotice(purchase === 'pro' ? 'Welcome to Pro! Your credits are ready.' : 'Your credits are ready.');
      }
    }, 2500);
    window.history.replaceState(null, '', '/studio');
    return () => clearInterval(timer);
  }, [purchase, loadProfile]);

  useEffect(() => {
    if (tab !== 'gallery') return;
    fetch('/api/gallery', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setGallery(d.images || []))
      .catch(() => setGallery([]));
  }, [tab]);

  async function generate() {
    setError('');
    setNeedCredits(false);
    if (prompt.trim().length < 3) {
      setError('Describe what you want first.');
      return;
    }
    if (profile && profile.credits < QUALITY[quality].credits) {
      setError('Not enough credits for this quality. Try Draft, or top up.');
      setNeedCredits(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, kind, quality, useBrand }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setNeedCredits(Boolean(data.needCredits));
      } else {
        setResults(data.images);
        setGallery(null);
      }
      await loadProfile();
    } catch {
      setError('Connection problem. Your credits are safe — try again.');
    } finally {
      setLoading(false);
    }
  }

  async function buy(item) {
    setBusyItem(item);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setNotice(data.error || 'Could not start checkout.');
    } finally {
      setBusyItem('');
    }
  }

  async function manageBilling() {
    setBusyItem('portal');
    try {
      const res = await fetch('/api/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setNotice(data.error || 'Could not open billing.');
    } finally {
      setBusyItem('');
    }
  }

  async function saveAccount(e) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, brandColors }),
    });
    setSaving(false);
    setNotice(res.ok ? 'Saved.' : 'Could not save. Try again.');
    loadProfile();
  }

  const credits = profile?.credits ?? '–';
  const cost = QUALITY[quality].credits;
  const isPro = profile?.plan === 'pro';
  const initials = (profile?.business_name || profile?.email || '?').slice(0, 2).toUpperCase();

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <div>
            <span className="brand" style={{ display: "inline-block", verticalAlign: "middle" }}><img src="/logo-white.png" alt="Ironik Grafix" style={{ height: 28, width: "auto", display: "block" }} /></span>
            <span className="brand-sub">AI Studio</span>
          </div>
          <nav className="tabs" aria-label="Studio sections">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" className="btn btn-ghost" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
          <button type="button" className="btn" style={{ borderRadius: 999 }} onClick={() => setTab('credits')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF2D95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            {credits} credits
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 8, background: '#2b4a5a', color: '#cfe8f2', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px var(--display)' }}>{initials}</div>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.business_name || profile?.email || ''}</div>
              <div className="muted" style={{ fontSize: 12 }}>{isPro ? 'Pro plan' : 'Free plan'}</div>
            </div>
          </div>
        </div>
      </header>

      {notice && (
        <div className="wrap" style={{ marginTop: 16 }}>
          <div className="alert alert-ok" role="status">{notice}</div>
        </div>
      )}

      <main className="wrap" style={{ padding: '28px 24px 64px' }}>
        {tab === 'create' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            <section className="card" aria-labelledby="gen-h" style={{ flex: '1 1 360px', maxWidth: 440, minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 id="gen-h" style={{ fontSize: 26 }}>Create a graphic</h1>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>Describe it, pick a style, get 4 options.</p>
              </div>

              <div className="field">
                <label className="label" htmlFor="prompt">What do you want?</label>
                <textarea id="prompt" className="input" rows={4} maxLength={1000} value={prompt} onChange={(e) => { setPrompt(e.target.value); setError(''); }} placeholder="e.g. A bold coffee bean badge with a mountain outline, two colors" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-2)', minHeight: 44, cursor: 'pointer' }}>
                  <input type="checkbox" checked={useBrand} onChange={() => setUseBrand(!useBrand)} style={{ width: 18, height: 18, accentColor: '#FF2D95' }} />
                  <span>Use my brand colors{profile && !profile.brand_colors ? ' (add them under Account)' : ''}</span>
                </label>
              </div>

              <div className="field">
                <span className="label">Type</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(KINDS).map(([id, k]) => (
                    <button key={id} type="button" className="chip" aria-pressed={kind === id} onClick={() => setKind(id)}>{k.label}</button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="label">Quality</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {Object.entries(QUALITY).map(([id, q]) => (
                    <button key={id} type="button" className="chip" aria-pressed={quality === id} onClick={() => { setQuality(id); setError(''); }} style={{ borderRadius: 10, minHeight: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span>{q.label}</span>
                      <span style={{ fontSize: 12 }}>{q.credits} {q.credits === 1 ? 'credit' : 'credits'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="alert alert-error" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                  <span>{error}</span>
                  {needCredits && <button type="button" className="btn" onClick={() => setTab('credits')}>Get more credits</button>}
                </div>
              )}

              <button type="button" className="btn btn-primary btn-lg" onClick={generate} disabled={loading}>
                {loading ? 'Creating 4 options… (up to a minute)' : `Generate · ${cost} ${cost === 1 ? 'credit' : 'credits'}`}
              </button>
              <p className="muted" style={{ margin: '-8px 0 0', fontSize: 12, textAlign: 'center' }}>
                You have {credits} credits.{isPro ? ` Pro adds ${PRO.monthlyCredits} every month.` : ''}
              </p>
            </section>

            <section aria-labelledby="res-h" style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <h2 id="res-h" style={{ fontSize: 20 }}>Results</h2>
                {results.length > 0 && <span className="muted small">Saved to My gallery</span>}
              </div>
              {results.length === 0 ? (
                <div className="empty" style={{ minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ margin: 0, maxWidth: 320 }}>Your 4 options will show up here. Everything you make is saved to your gallery automatically.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {results.map((r) => (
                    <article key={r.id} className="tile">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="thumb" src={r.url} alt={`Option ${r.n} for: ${prompt}`} />
                      <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button type="button" className="btn" style={{ flex: '1 1 auto' }} onClick={() => downloadImage(r.url, `ironik-option-${r.n}.png`)}>Download PNG</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'gallery' && (
          <section aria-labelledby="gal-h" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 id="gal-h" style={{ fontSize: 26 }}>My AI gallery</h1>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>Everything you&apos;ve generated.</p>
            </div>
            {gallery === null ? (
              <p className="muted">Loading…</p>
            ) : gallery.length === 0 ? (
              <div className="empty">
                Nothing here yet.{' '}
                <button type="button" className="btn btn-ghost" style={{ color: 'var(--accent)', textDecoration: 'underline' }} onClick={() => setTab('create')}>Create your first graphic</button>
              </div>
            ) : (
              <div className="grid-auto">
                {gallery.map((g) => (
                  <article key={g.id} className="tile">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="thumb" src={g.url} alt={g.prompt} loading="lazy" />
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.prompt}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{g.kind} · {new Date(g.createdAt).toLocaleDateString()}</span>
                      <button type="button" className="btn" style={{ marginTop: 6 }} onClick={() => downloadImage(g.url, `ironik-${g.id.slice(0, 8)}.png`)}>Download</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'credits' && (
          <section aria-labelledby="cred-h" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h1 id="cred-h" style={{ fontSize: 26 }}>Credits</h1>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
                1 Standard image = {QUALITY.standard.credits} credits, and every image comes with 4 options to pick from. Packs never expire.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div className="card" style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="muted small">Balance</span>
                <span style={{ font: '700 40px var(--display)' }}>{credits}</span>
                <span className="muted small">{isPro ? `Pro adds ${PRO.monthlyCredits} credits each billing month.` : 'Free plan — buy images as you need them.'}</span>
              </div>
              <div className="card" style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {isPro ? (
                  <>
                    <span className="label">You&apos;re on Pro</span>
                    <span className="muted small">Update your card or cancel any time.</span>
                    <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={manageBilling} disabled={busyItem === 'portal'}>Manage billing</button>
                  </>
                ) : (
                  <>
                    <span className="label">Go Pro — {money(PRO.cents)}/month</span>
                    <span className="muted small">{PRO.monthlyCredits} credits every month ({Math.floor(PRO.monthlyCredits / QUALITY.standard.credits)} Standard images). Cancel any time.</span>
                    <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => buy('pro')} disabled={busyItem === 'pro'}>
                      {busyItem === 'pro' ? 'Opening checkout…' : 'Upgrade to Pro'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <h2 style={{ fontSize: 20 }}>Image packs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {Object.entries(PACKS).map(([id, p]) => {
                const images = p.credits / QUALITY.standard.credits;
                return (
                  <div key={id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ font: '700 28px var(--display)' }}>{images} Standard {images === 1 ? 'image' : 'images'}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{p.credits} credits · {money(Math.round(p.cents / images))} per image</span>
                    <button type="button" className="btn btn-primary" style={{ marginTop: 'auto', minHeight: 48 }} onClick={() => buy(id)} disabled={busyItem === id}>
                      {busyItem === id ? 'Opening checkout…' : `Buy ${money(p.cents)}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="muted small" style={{ margin: 0 }}>Secure payment by Stripe.</p>
          </section>
        )}

        {tab === 'account' && (
          <section aria-labelledby="acct-h" style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h1 id="acct-h" style={{ fontSize: 26 }}>Account</h1>
            <form className="card" onSubmit={saveAccount} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label className="label" htmlFor="bn">Business name</label>
                <input id="bn" className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={120} />
              </div>
              <div className="field">
                <label className="label" htmlFor="bc">Brand colors</label>
                <input id="bc" className="input" value={brandColors} onChange={(e) => setBrandColors(e.target.value)} maxLength={300} placeholder="e.g. navy #1F3B4D, burnt orange #C8551B, cream #F2EBDD" />
                <span className="muted small">Used when “Use my brand colors” is checked.</span>
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </form>
            <p className="muted small" style={{ margin: 0 }}>Logged in as {profile?.email}</p>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn">Log out</button>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
