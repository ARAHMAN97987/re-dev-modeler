// One-time utility: Copy a project and optionally patch fields
// GET /api/copy-project?src=ID&uid=UID&name=NewName&patches=JSON

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });

  const restUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' };

  try {
    const { src, uid, name, patches } = req.query;
    if (!src || !uid) return res.status(400).json({ error: 'src (project id) and uid required' });

    // Read source project
    const srcKey = `redev:project:${src}`;
    const r1 = await fetch(`${restUrl}?key=eq.${encodeURIComponent(srcKey)}&user_id=eq.${encodeURIComponent(uid)}&select=value`, { headers });
    const rows = await r1.json();
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Source project not found' });

    let project = JSON.parse(rows[0].value);

    // New ID
    const newId = crypto.randomUUID();
    project.id = newId;
    project.name = name || (project.name + ' (تدقيق)');
    project.createdAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();

    // Apply patches if provided
    if (patches) {
      try {
        const p = JSON.parse(decodeURIComponent(patches));
        Object.assign(project, p);
        // Also patch per-phase financing if patches include phase-level fields
        if (p._patchPhases && Array.isArray(project.phases)) {
          for (const phase of project.phases) {
            if (phase.financing) {
              for (const [k, v] of Object.entries(p._patchPhases)) {
                phase.financing[k] = v;
              }
            }
          }
          delete project._patchPhases;
        }
      } catch (e) { /* ignore bad patches */ }
    }

    // Save copy
    const newKey = `redev:project:${newId}`;
    const r2 = await fetch(restUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ key: newKey, value: JSON.stringify(project), user_id: uid, updated_at: new Date().toISOString() }),
    });
    if (!r2.ok) return res.status(500).json({ error: 'Failed to save copy', detail: await r2.text() });

    // Update projects index
    const idxKey = 'redev:projects-index';
    const r3 = await fetch(`${restUrl}?key=eq.${encodeURIComponent(idxKey)}&user_id=eq.${encodeURIComponent(uid)}&select=value`, { headers });
    const idxRows = await r3.json();
    let index = [];
    if (idxRows && idxRows.length > 0) { try { index = JSON.parse(idxRows[0].value); } catch {} }
    index.push({ id: newId, name: project.name, status: project.status || 'Draft', updatedAt: project.updatedAt, createdAt: project.createdAt });
    await fetch(`${restUrl}?key=eq.${encodeURIComponent(idxKey)}&user_id=eq.${encodeURIComponent(uid)}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ value: JSON.stringify(index), updated_at: new Date().toISOString() }),
    });

    return res.status(200).json({ ok: true, newId, newKey, name: project.name, patchesApplied: !!patches });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
