// Vercel Serverless Function - Admin: List/Get Users
// GET /api/admin/users               → list all users (with pagination, search, status filter)
// GET /api/admin/users?id=X          → get single user details
// Requires X-Admin-Key header matching ADMIN_SECRET env var

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Auth
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  const key = req.headers['x-admin-key'];
  if (key !== adminSecret) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });

  const authUrl = `${supabaseUrl}/auth/v1/admin`;
  const kvUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const authHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };
  const kvHeaders = { ...authHeaders, 'Prefer': 'resolution=merge-duplicates' };

  try {
    const { id, search, status, page = '1', limit = '50' } = req.query;
    const pg = Math.max(1, parseInt(page) || 1);
    const lm = Math.min(200, Math.max(1, parseInt(limit) || 50));

    // ── Single user detail ──
    if (id) {
      const userResp = await fetch(`${authUrl}/users/${id}`, { headers: authHeaders });
      if (!userResp.ok) return res.status(404).json({ error: 'User not found' });
      const userJson = await userResp.json();
      const user = userJson.user || userJson; // Supabase may return {user:{...}} or {...} directly

      // Get subscription from kv_store
      const subKey = `haseef_sub_${id}`;
      const subResp = await fetch(`${kvUrl}?key=eq.${encodeURIComponent(subKey)}&select=value,updated_at`, { headers: kvHeaders });
      const subRows = await subResp.json();
      let subscription = null;
      if (subRows?.length > 0) { try { subscription = JSON.parse(subRows[0].value); } catch {} }

      // Get project count and list
      const projResp = await fetch(`${kvUrl}?key=like.redev:project:*&user_id=eq.${encodeURIComponent(id)}&select=key,updated_at&order=updated_at.desc`, { headers: kvHeaders });
      const projRows = await projResp.json();
      // Filter to only project data keys (not index)
      const projects = (projRows || []).filter(r => r.key.startsWith('redev:project:') && r.key !== 'redev:projects-index');

      // Get projects index for names
      const idxResp = await fetch(`${kvUrl}?key=eq.redev:projects-index&user_id=eq.${encodeURIComponent(id)}&select=value`, { headers: kvHeaders });
      const idxRows = await idxResp.json();
      let projectIndex = [];
      if (idxRows?.length > 0) { try { projectIndex = JSON.parse(idxRows[0].value); } catch {} }

      return res.status(200).json({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        phone: user.phone,
        subscription,
        projectCount: projectIndex.length,
        projects: projectIndex.map(p => ({ id: p.id, name: p.name, status: p.status, finMode: p.finMode, assetCount: p.assetCount, updatedAt: p.updatedAt })),
      });
    }

    // ── List all users ──
    const usersResp = await fetch(`${authUrl}/users?page=${pg}&per_page=${lm}`, { headers: authHeaders });
    if (!usersResp.ok) return res.status(usersResp.status).json({ error: 'Failed to fetch users' });
    const { users, total } = await usersResp.json();

    // Build subscription map from kv_store
    const subKeys = users.map(u => `haseef_sub_${u.id}`);
    let subMap = {};
    if (subKeys.length > 0) {
      // Fetch all subscription keys in one request using OR filter
      const orFilter = subKeys.map(k => `key.eq.${encodeURIComponent(k)}`).join(',');
      const subResp = await fetch(`${kvUrl}?or=(${orFilter})&select=key,value`, { headers: kvHeaders });
      const subRows = await subResp.json();
      for (const row of (subRows || [])) {
        const uid = row.key.replace('haseef_sub_', '');
        try { subMap[uid] = JSON.parse(row.value); } catch {}
      }
    }

    // Get project counts per user from kv_store indexes
    const idxKeys = users.map(u => u.id);
    let projectCountMap = {};
    for (const uid of idxKeys) {
      // We'll batch this - fetch indexes for all users
      const idxResp = await fetch(`${kvUrl}?key=eq.redev:projects-index&user_id=eq.${encodeURIComponent(uid)}&select=value`, { headers: kvHeaders });
      const idxRows = await idxResp.json();
      if (idxRows?.length > 0) {
        try { projectCountMap[uid] = JSON.parse(idxRows[0].value).length; } catch { projectCountMap[uid] = 0; }
      } else { projectCountMap[uid] = 0; }
    }

    // Map users with enrichment
    let result = users.map(u => {
      const sub = subMap[u.id] || null;
      const now = Date.now();
      let subStatus = 'none';
      if (sub) {
        if (sub.status === 'active' && sub.expiresAt > now) subStatus = 'active';
        else if (sub.status === 'trial' && sub.trialEndsAt > now) subStatus = 'trial';
        else if (sub.status === 'trial' && sub.trialEndsAt <= now) subStatus = 'expired';
        else subStatus = sub.status || 'none';
      }
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        subscription: { status: subStatus, plan: sub?.plan || null, trialEndsAt: sub?.trialEndsAt || null, expiresAt: sub?.expiresAt || null },
        projectCount: projectCountMap[u.id] || 0,
      };
    });

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => u.email?.toLowerCase().includes(q));
    }

    // Apply status filter
    if (status && status !== 'all') {
      result = result.filter(u => u.subscription.status === status);
    }

    return res.status(200).json({ users: result, total, page: pg, limit: lm });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
