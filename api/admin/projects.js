// Vercel Serverless Function - Admin: List/Get Projects
// GET /api/admin/projects                → list all projects across all users
// GET /api/admin/projects?userId=X       → list projects for specific user
// GET /api/admin/projects?id=X           → get full project data
// GET /api/admin/projects?search=name    → search projects by name
// Requires X-Admin-Key header

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  if (req.headers['x-admin-key'] !== adminSecret) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });

  const kvUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };

  try {
    const { id, userId, search, page = '1', limit = '50' } = req.query;
    const pg = Math.max(1, parseInt(page) || 1);
    const lm = Math.min(200, Math.max(1, parseInt(limit) || 50));

    // ── Single project (full data) ──
    if (id) {
      const key = `redev:project:${id}`;
      let url = `${kvUrl}?key=eq.${encodeURIComponent(key)}&select=key,value,user_id,updated_at`;
      const resp = await fetch(url, { headers });
      const rows = await resp.json();
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Project not found' });
      const row = rows[0];
      let project;
      try { project = JSON.parse(row.value); } catch { return res.status(500).json({ error: 'Failed to parse project' }); }

      // Get owner email
      const authUrl = `${supabaseUrl}/auth/v1/admin/users/${row.user_id}`;
      const authHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
      let ownerEmail = null;
      try {
        const userResp = await fetch(authUrl, { headers: authHeaders });
        if (userResp.ok) { const { user } = await userResp.json(); ownerEmail = user.email; }
      } catch {}

      return res.status(200).json({
        id: project.id || id,
        userId: row.user_id,
        ownerEmail,
        updatedAt: row.updated_at,
        project,
      });
    }

    // ── List projects ──
    // Fetch project indexes (contain project metadata)
    let indexUrl = `${kvUrl}?key=eq.redev:projects-index&select=key,value,user_id,updated_at`;
    if (userId) indexUrl += `&user_id=eq.${encodeURIComponent(userId)}`;
    indexUrl += `&order=updated_at.desc`;

    const resp = await fetch(indexUrl, { headers });
    const rows = await resp.json();

    // Flatten all project indexes into one list
    let allProjects = [];
    for (const row of (rows || [])) {
      let index;
      try { index = JSON.parse(row.value); } catch { continue; }
      for (const p of index) {
        allProjects.push({
          id: p.id,
          name: p.name,
          status: p.status,
          finMode: p.finMode,
          landType: p.landType,
          location: p.location,
          assetCount: p.assetCount || 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          userId: row.user_id,
        });
      }
    }

    // Get owner emails (batch)
    const uniqueUserIds = [...new Set(allProjects.map(p => p.userId))];
    let emailMap = {};
    const authHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
    for (const uid of uniqueUserIds) {
      try {
        const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${uid}`, { headers: authHeaders });
        if (r.ok) { const { user } = await r.json(); emailMap[uid] = user.email; }
      } catch {}
    }
    allProjects = allProjects.map(p => ({ ...p, ownerEmail: emailMap[p.userId] || null }));

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      allProjects = allProjects.filter(p => p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q));
    }

    // Sort by updatedAt desc
    allProjects.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    // Paginate
    const total = allProjects.length;
    const start = (pg - 1) * lm;
    const paged = allProjects.slice(start, start + lm);

    return res.status(200).json({ projects: paged, total, page: pg, limit: lm });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
