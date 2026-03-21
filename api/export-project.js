// Vercel Serverless Function - exports project data from Supabase
// GET /api/export-project → lists all projects
// GET /api/export-project?key=redev:project:xxx → returns specific project

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const restUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const { key } = req.query;

    if (key) {
      // Fetch specific key
      const url = `${restUrl}?key=eq.${encodeURIComponent(key)}&select=key,value,user_id,updated_at`;
      const resp = await fetch(url, { headers });
      const data = await resp.json();
      if (!data || data.length === 0) return res.status(404).json({ error: 'Key not found' });
      // Parse value if JSON
      const row = data[0];
      try { row.parsed = JSON.parse(row.value); } catch {}
      return res.status(200).json(row);
    }

    // List all keys (just key + user_id + updated_at, no value - too large)
    const url = `${restUrl}?select=key,user_id,updated_at&order=updated_at.desc&limit=100`;
    const resp = await fetch(url, { headers });
    const data = await resp.json();
    return res.status(200).json({ count: data.length, keys: data });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
