// POST /api/deploy — rebuilds the live site (any admin or editor).
import { handle, requireRole, service, HttpError } from './_lib/supabase.js';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
  await requireRole(req, ['admin', 'editor']);
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) throw new HttpError(500, 'VERCEL_DEPLOY_HOOK_URL is not set in Vercel');
  const res = await fetch(hook, { method: 'POST' });
  if (!res.ok) throw new HttpError(502, `Vercel deploy hook failed (${res.status})`);
  const at = new Date().toISOString();
  await service('/rest/v1/settings?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ key: 'last_deploy_at', value: at, updated_at: at }),
  });
  return { ok: true, at };
});
