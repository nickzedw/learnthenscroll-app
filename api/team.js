// Admin-only team management.
//   POST   /api/team  { email, role }  — email an invite (role: admin | editor)
//   DELETE /api/team  { id }           — remove someone's access entirely
import { handle, requireRole, service, HttpError } from './_lib/supabase.js';

export default handle(async (req) => {
  const me = await requireRole(req, ['admin']);
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  if (req.method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const role = body.role === 'admin' ? 'admin' : 'editor';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const user = await service(`/auth/v1/invite?redirect_to=${encodeURIComponent(origin + '/admin/')}`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    await service(`/rest/v1/profiles?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
    return { ok: true, id: user.id };
  }

  if (req.method === 'DELETE') {
    const id = String(body.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Missing user id');
    if (id === me.id) throw new HttpError(400, "You can't remove yourself");
    await service(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
    return { ok: true };
  }

  throw new HttpError(405, 'Use POST or DELETE');
});
