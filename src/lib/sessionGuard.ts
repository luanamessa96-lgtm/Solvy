export interface SessionAuthClient {
  auth: {
    getSession: () => Promise<{ data: { session: { expires_at?: number } | null } }>;
    refreshSession: () => Promise<{ data: { session: unknown | null }; error: { message: string } | null }>;
  };
}

export async function ensureFreshSession(sb: SessionAuthClient): Promise<boolean> {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return false;

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt - now > 60) return true;

  const { data, error } = await sb.auth.refreshSession();
  return !error && !!data.session;
}
