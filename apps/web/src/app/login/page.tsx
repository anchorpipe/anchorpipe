'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setStatus('Logged in');
      window.location.href = '/dashboard';
    } else {
      let message = 'Login failed';
      try {
        const data: { error?: string } = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // Ignore JSON parsing errors
      }
      setStatus(message);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 8 }}
        />
        <button type="submit" style={{ padding: 10 }}>
          Sign in
        </button>
      </form>
      {status && <p>{status}</p>}
    </main>
  );
}
