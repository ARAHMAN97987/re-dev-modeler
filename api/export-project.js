// Vercel Serverless Function - read/write project data in Supabase
// GET  /api/export-project              → list all keys
// GET  /api/export-project?key=X&uid=Y  → read specific key
// POST /api/export-project { key, value, user_id } → write/upsert key

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });

  const restUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  };

  try {
    if (req.method === 'POST') {
      const { key, value, user_id } = req.body;
      if (!key || !value || !user_id) return res.status(400).json({ error: 'key, value, user_id required' });
      const resp = await fetch(restUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, value: typeof value === 'string' ? value : JSON.stringify(value), user_id, updated_at: new Date().toISOString() }),
      });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      return res.status(200).json({ ok: true, key });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'GET or POST only' });

    const { key, uid } = req.query;
    if (key) {
      let url = `${restUrl}?key=eq.${encodeURIComponent(key)}&select=key,value,user_id,updated_at`;
      if (uid) url += `&user_id=eq.${encodeURIComponent(uid)}`;
      const resp = await fetch(url, { headers });
      const data = await resp.json();
      if (!data || data.length === 0) return res.status(404).json({ error: 'Key not found' });
      const row = data[0];
      try { row.parsed = JSON.parse(row.value); } catch {}
      return res.status(200).json(row);
    }

    const url = `${restUrl}?select=key,user_id,updated_at&order=updated_at.desc&limit=100`;
    const resp = await fetch(url, { headers });
    const data = await resp.json();
    return res.status(200).json({ count: data.length, keys: data });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
