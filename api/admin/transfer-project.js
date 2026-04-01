// Vercel Serverless Function - Admin: Transfer Project Ownership
// POST /api/admin/transfer-project
// Body: { projectId, fromUserId, toUserId }
// toUserId="admin" → unassign (orphan project to admin storage)
// fromUserId="admin" → assign orphaned project to a user
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

  const kvUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' };

  try {
    const { projectId, fromUserId, toUserId } = req.body;
    if (!projectId || !fromUserId || !toUserId) return res.status(400).json({ error: 'projectId, fromUserId, toUserId are all required' });
    if (fromUserId === toUserId) return res.status(400).json({ error: 'Source and target user are the same' });

    const projectKey = `redev:project:${projectId}`;

    // 1. Fetch the project from source user
    const getUrl = `${kvUrl}?key=eq.${encodeURIComponent(projectKey)}&user_id=eq.${encodeURIComponent(fromUserId)}&select=key,value,user_id`;
    const getResp = await fetch(getUrl, { headers });
    const rows = await getResp.json();
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Project not found for source user' });

    const projectValue = rows[0].value;
    let projectData;
    try { projectData = JSON.parse(projectValue); } catch { projectData = null; }

    // 2. Delete the project from source user
    const delUrl = `${kvUrl}?key=eq.${encodeURIComponent(projectKey)}&user_id=eq.${encodeURIComponent(fromUserId)}`;
    const delResp = await fetch(delUrl, { method: 'DELETE', headers });
    if (!delResp.ok) return res.status(500).json({ error: 'Failed to delete project from source user' });

    // 3. Insert project under target user
    const insertResp = await fetch(kvUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: projectKey, value: projectValue, user_id: toUserId, updated_at: new Date().toISOString() }),
    });
    if (!insertResp.ok) return res.status(500).json({ error: 'Failed to insert project for target user' });

    // 4. Update source user's projects-index (remove this project)
    const srcIdxUrl = `${kvUrl}?key=eq.redev:projects-index&user_id=eq.${encodeURIComponent(fromUserId)}&select=value`;
    const srcIdxResp = await fetch(srcIdxUrl, { headers });
    const srcIdxRows = await srcIdxResp.json();
    if (srcIdxRows?.length > 0) {
      let srcIndex;
      try { srcIndex = JSON.parse(srcIdxRows[0].value); } catch { srcIndex = []; }
      srcIndex = srcIndex.filter(p => p.id !== projectId);
      await fetch(kvUrl, {
        method: 'POST', headers,
        body: JSON.stringify({ key: 'redev:projects-index', value: JSON.stringify(srcIndex), user_id: fromUserId, updated_at: new Date().toISOString() }),
      });
    }

    // 5. Update target user's projects-index (add this project)
    const tgtIdxUrl = `${kvUrl}?key=eq.redev:projects-index&user_id=eq.${encodeURIComponent(toUserId)}&select=value`;
    const tgtIdxResp = await fetch(tgtIdxUrl, { headers });
    const tgtIdxRows = await tgtIdxResp.json();
    let tgtIndex = [];
    if (tgtIdxRows?.length > 0) { try { tgtIndex = JSON.parse(tgtIdxRows[0].value); } catch {} }

    // Build metadata entry for the index
    const meta = projectData ? {
      id: projectData.id || projectId,
      name: projectData.name || 'Transferred Project',
      status: projectData.status || 'Draft',
      finMode: projectData.finMode || 'self',
      landType: projectData.landType || 'lease',
      location: projectData.location || '',
      assetCount: (projectData.assets || []).length,
      createdAt: projectData.createdAt,
      updatedAt: new Date().toISOString(),
    } : { id: projectId, name: 'Transferred Project', status: 'Draft', updatedAt: new Date().toISOString() };

    // Remove duplicate if exists, then add
    tgtIndex = tgtIndex.filter(p => p.id !== projectId);
    tgtIndex.push(meta);
    await fetch(kvUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ key: 'redev:projects-index', value: JSON.stringify(tgtIndex), user_id: toUserId, updated_at: new Date().toISOString() }),
    });

    // 6. Log the transfer
    const logKey = `admin_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fetch(kvUrl, {
      method: 'POST', headers,
      body: JSON.stringify({
        key: logKey,
        value: JSON.stringify({
          action: 'transfer_project',
          projectId, projectName: meta.name,
          fromUserId, toUserId,
          timestamp: new Date().toISOString(),
        }),
        user_id: 'admin', updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ ok: true, projectId, from: fromUserId, to: toUserId, projectName: meta.name });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
