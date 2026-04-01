// Vercel Serverless Function - Admin: Modify User Subscription
// POST /api/admin/subscription
// Body: { userId, action: 'activate'|'extend_trial'|'cancel'|'change_plan', plan?, days? }
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
    const { userId, action, plan, days } = req.body;
    if (!userId || !action) return res.status(400).json({ error: 'userId and action required' });

    const subKey = `haseef_sub_${userId}`;
    const now = Date.now();

    // Get current subscription
    const getResp = await fetch(`${kvUrl}?key=eq.${encodeURIComponent(subKey)}&select=value`, { headers });
    const rows = await getResp.json();
    let current = null;
    if (rows?.length > 0) { try { current = JSON.parse(rows[0].value); } catch {} }

    let updated;

    switch (action) {
      case 'activate': {
        const durationDays = days || 365;
        updated = {
          status: 'active',
          plan: plan || current?.plan || 'growth',
          expiresAt: now + durationDays * 24 * 60 * 60 * 1000,
          startedAt: now,
          activatedBy: 'admin',
          activatedAt: new Date().toISOString(),
        };
        break;
      }
      case 'extend_trial': {
        const extendDays = days || 14;
        const currentEnd = current?.trialEndsAt || now;
        updated = {
          ...current,
          status: 'trial',
          trialEndsAt: currentEnd + extendDays * 24 * 60 * 60 * 1000,
          extendedBy: 'admin',
          extendedAt: new Date().toISOString(),
        };
        break;
      }
      case 'cancel': {
        updated = {
          status: 'none',
          cancelledBy: 'admin',
          cancelledAt: new Date().toISOString(),
          previousPlan: current?.plan || null,
        };
        break;
      }
      case 'change_plan': {
        if (!plan) return res.status(400).json({ error: 'plan required for change_plan action' });
        updated = {
          ...current,
          plan,
          changedBy: 'admin',
          changedAt: new Date().toISOString(),
        };
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}. Valid: activate, extend_trial, cancel, change_plan` });
    }

    // Save to kv_store
    const saveResp = await fetch(kvUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key: subKey,
        value: JSON.stringify(updated),
        user_id: userId,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!saveResp.ok) return res.status(saveResp.status).json({ error: await saveResp.text() });

    // Log the action
    const logKey = `admin_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fetch(kvUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key: logKey,
        value: JSON.stringify({ action, userId, plan, days, timestamp: new Date().toISOString(), previous: current }),
        user_id: 'admin',
        updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ ok: true, action, userId, subscription: updated });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
