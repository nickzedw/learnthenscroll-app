// POST /api/click { store, page_path } — counts an App Store / Google Play button click.
// Anonymous: only the store and the page are stored. Used by the blog and learnthenscroll.com.
import { handle, HttpError } from './_lib/supabase.js';

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const store = body.store === 'android' ? 'android' : body.store === 'ios' ? 'ios' : null;
  if (!store) throw new HttpError(400, 'Unknown store');
  const page_path = String(body.page_path || '/').slice(0, 300);
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';
  const res = await fetch(`${url}/rest/v1/store_clicks`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ store, page_path }),
  });
  if (!res.ok) throw new HttpError(502, 'Could not record click');
  return { ok: true };
});
