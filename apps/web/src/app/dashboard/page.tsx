async function getMe() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/auth/me`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const me = await getMe();
  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 16 }}>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(me, null, 2)}</pre>
      <form action="/api/auth/logout" method="post">
        <button type="submit" style={{ padding: 10 }}>
          Sign out
        </button>
      </form>
    </main>
  );
}
