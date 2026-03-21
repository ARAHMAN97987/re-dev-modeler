// Patch a specific phase's financing settings
// GET /api/patch-phase?id=X&uid=Y&phase=ZAN%201&patches={"exitYear":2033}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'No Supabase' });

  const restUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };

  try {
    const { id, uid, phase, patches } = req.query;
    if (!id || !uid || !phase || !patches) return res.status(400).json({ error: 'id, uid, phase, patches required' });

    const key = `redev:project:${id}`;
    const r1 = await fetch(`${restUrl}?key=eq.${encodeURIComponent(key)}&user_id=eq.${encodeURIComponent(uid)}&select=value`, { headers });
    const rows = await r1.json();
    if (!rows?.length) return res.status(404).json({ error: 'Not found' });

    let project = JSON.parse(rows[0].value);
    const p = JSON.parse(decodeURIComponent(patches));
    const phaseName = decodeURIComponent(phase);

    const phaseObj = (project.phases || []).find(ph => ph.name === phaseName);
    if (!phaseObj) return res.status(404).json({ error: `Phase "${phaseName}" not found` });
    if (!phaseObj.financing) phaseObj.financing = {};

    const applied = {};
    for (const [k, v] of Object.entries(p)) {
      applied[k] = { old: phaseObj.financing[k], new: v };
      phaseObj.financing[k] = v;
    }

    project.updatedAt = new Date().toISOString();

    const updateUrl = `${restUrl}?key=eq.${encodeURIComponent(key)}&user_id=eq.${encodeURIComponent(uid)}`;
    const r2 = await fetch(updateUrl, {
      method: 'PATCH', headers,
      body: JSON.stringify({ value: JSON.stringify(project), updated_at: project.updatedAt }),
    });
    if (!r2.ok) return res.status(500).json({ error: await r2.text() });

    return res.status(200).json({ ok: true, phase: phaseName, applied });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
