// One-shot: Read project, apply patches to project-level + all phase.financing, save back
// GET /api/patch-project?id=X&uid=Y&patches={"maxLtvPct":70}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'No Supabase' });

  const restUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' };

  try {
    const { id, uid, patches } = req.query;
    if (!id || !uid || !patches) return res.status(400).json({ error: 'id, uid, patches required' });

    const key = `redev:project:${id}`;
    const r1 = await fetch(`${restUrl}?key=eq.${encodeURIComponent(key)}&user_id=eq.${encodeURIComponent(uid)}&select=value`, { headers });
    const rows = await r1.json();
    if (!rows?.length) return res.status(404).json({ error: 'Not found' });

    let project = JSON.parse(rows[0].value);
    const p = JSON.parse(decodeURIComponent(patches));

    // Apply to project level
    const applied = {};
    for (const [k, v] of Object.entries(p)) {
      applied[k] = { old: project[k], new: v };
      project[k] = v;
    }

    // Apply to each phase.financing (if the field exists there)
    const phaseApplied = {};
    if (Array.isArray(project.phases)) {
      for (const phase of project.phases) {
        if (phase.financing) {
          phaseApplied[phase.name] = {};
          for (const [k, v] of Object.entries(p)) {
            if (k in phase.financing) {
              phaseApplied[phase.name][k] = { old: phase.financing[k], new: v };
              phase.financing[k] = v;
            }
          }
        }
      }
    }

    project.updatedAt = new Date().toISOString();

    // Save
    const r2 = await fetch(restUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ key, value: JSON.stringify(project), user_id: uid, updated_at: project.updatedAt }),
    });
    if (!r2.ok) return res.status(500).json({ error: await r2.text() });

    return res.status(200).json({ ok: true, id, applied, phaseApplied });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
