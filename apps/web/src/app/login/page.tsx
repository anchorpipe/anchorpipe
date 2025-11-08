'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for OAuth errors in URL
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    if (error && message) {
      setStatus(`Error: ${decodeURIComponent(message)}`);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
    } catch (error) {
      setStatus('Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  function handleGitHubLogin() {
    window.location.href = '/api/auth/oauth/github';
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
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 8 }}
        />
        <button type="submit" style={{ padding: 10 }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 1,
              background: '#ccc',
            }}
          />
          <span style={{ background: 'white', padding: '0 8px', position: 'relative' }}>or</span>
        </div>
        <button
          type="button"
          onClick={handleGitHubLogin}
          style={{
            padding: 10,
            width: '100%',
            background: '#24292e',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Sign in with GitHub
        </button>
      </div>
      {status && <p style={{ marginTop: 16, color: status.startsWith('Error:') ? 'red' : 'inherit' }}>{status}</p>}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
        <h1>Sign in</h1>
        <p>Loading...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
