// Shared helpers for the /api functions (run on Vercel, never in the browser).
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Calls Supabase with the service-role key (bypasses row-level security).
export async function service(pathAndQuery, init = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new HttpError(500, 'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${SUPABASE_URL}${pathAndQuery}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new HttpError(res.status, body?.msg || body?.message || body?.error_description || `Supabase error ${res.status}`);
  return body;
}

// Verifies the caller's Supabase session and checks their role.
export async function requireRole(req, roles) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Not signed in');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new HttpError(401, 'Session expired — sign in again');
  const user = await res.json();
  const [profile] = await service(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,email,role`);
  if (!profile || !roles.includes(profile.role)) throw new HttpError(403, 'You do not have permission to do that');
  return profile;
}

export function handle(fn) {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      res.status(200).json(out ?? { ok: true });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
    }
  };
}
