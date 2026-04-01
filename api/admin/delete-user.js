// Vercel Serverless Function - Admin: Delete User Completely
// POST /api/admin/delete-user
// Body: { userId }
// Deletes: Supabase auth user + all projects + subscription + projects index
// Requires X-Admin-Key header

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  if (req.headers['x-admin-key'] !== adminSecret) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });

  const authHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };
  const kvUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const kvHeaders = { ...authHeaders, 'Prefer': 'resolution=merge-duplicates' };

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // 1. Get user email before deletion (for logging)
    let userEmail = null;
    try {
      const userResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, { headers: authHeaders });
      if (userResp.ok) {
        const uj = await userResp.json();
        const user = uj.user || uj;
        userEmail = user.email;
      }
    } catch {}

    // 2. Delete all kv_store entries for this user
    const deleteKv = async (keyFilter) => {
      const url = `${kvUrl}?${keyFilter}&user_id=eq.${encodeURIComponent(userId)}`;
      await fetch(url, { method: 'DELETE', headers: kvHeaders });
    };

    // Delete projects (redev:project:*)
    await deleteKv('key=like.redev:project:*');
    // Delete projects index
    await deleteKv('key=eq.redev:projects-index');
    // Delete subscription
    await deleteKv(`key=eq.haseef_sub_${userId}`);

    // 3. Delete the Supabase auth user
    const delResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    if (!delResp.ok) {
      const err = await delResp.json();
      return res.status(400).json({ error: err.message || 'Failed to delete user from auth' });
    }

    // 4. Log the deletion
    const logKey = `admin_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fetch(kvUrl, {
      method: 'POST',
      headers: kvHeaders,
      body: JSON.stringify({
        key: logKey,
        value: JSON.stringify({ action: 'delete_user', userId, email: userEmail, timestamp: new Date().toISOString() }),
        user_id: 'admin',
        updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ ok: true, userId, email: userEmail, deleted: ['auth_user', 'projects', 'subscription', 'index'] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
