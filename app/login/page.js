'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
    });
    if (error) {
      setStatus('error');
      setError(error.message || 'Could not send the link. Try again.');
    } else {
      setStatus('sent');
    }
  }

  return (
    <main className="wrap" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Link href="/" className="brand"><img src="/logo-white.png" alt="Ironik Grafix" style={{ height: 28, width: "auto", display: "block" }} /></Link>
        <div>
          <h1 style={{ fontSize: 26 }}>Log in or create an account</h1>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
            We&apos;ll email you a secure link. No password needed.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="alert alert-ok" role="status">
            Check your inbox for a link from us. Open it on this device to log in.
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
              />
            </div>
            {status === 'error' && <div className="alert alert-error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Email me a login link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
