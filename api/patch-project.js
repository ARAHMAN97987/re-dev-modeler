export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'No Supabase' });

  const restUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };

  try {
    const { id, uid, patches } = req.query;
    if (!id || !uid || !patches) return res.status(400).json({ error: 'id, uid, patches required' });

    const key = `redev:project:${id}`;

    const r1 = await fetch(`${restUrl}?key=eq.${encodeURIComponent(key)}&user_id=eq.${encodeURIComponent(uid)}&select=value`, { headers });
    const rows = await r1.json();
    if (!rows?.length) return res.status(404).json({ error: 'Not found' });

    let project = JSON.parse(rows[0].value);
    const p = JSON.parse(decodeURIComponent(patches));

    // Clean up broken overlay keys from previous bug (numbered "0","1","2"...)
    for (const k of Object.keys(project)) {
      if (/^\d+$/.test(k)) delete project[k];
    }

    const applied = {};

    if (Array.isArray(p)) {
      // Format: [{path: "startYear", value: 2026}, {path: "assets.4.opEbitda", value: 0}]
      for (const patch of p) {
        const { path, value } = patch;
        if (!path) continue;
        const parts = path.split('.');
        let target = project;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = /^\d+$/.test(parts[i]) ? parseInt(parts[i]) : parts[i];
          if (target[part] === undefined || target[part] === null) break;
          target = target[part];
        }
        const lastKey = /^\d+$/.test(parts[parts.length - 1]) ? parseInt(parts[parts.length - 1]) : parts[parts.length - 1];
        applied[path] = { old: target[lastKey], new: value };
        target[lastKey] = value;
      }
    } else {
      // Format: {startYear: 2026, maxLtvPct: 70}
      for (const [k, v] of Object.entries(p)) {
        applied[k] = { old: project[k], new: v };
        project[k] = v;
      }
      if (Array.isArray(project.phases)) {
        for (const phase of project.phases) {
          if (phase.financing) {
            for (const [k, v] of Object.entries(p)) {
              if (k in phase.financing) phase.financing[k] = v;
            }
          }
        }
      }
    }

    project.updatedAt = new Date().toISOString();

    const updateUrl = `${restUrl}?key=eq.${encodeURIComponent(key)}&user_id=eq.${encodeURIComponent(uid)}`;
    const r2 = await fetch(updateUrl, {
      method: 'PATCH', headers,
      body: JSON.stringify({ value: JSON.stringify(project), updated_at: project.updatedAt }),
    });
    if (!r2.ok) return res.status(500).json({ error: await r2.text() });

    return res.status(200).json({ ok: true, id, applied });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
