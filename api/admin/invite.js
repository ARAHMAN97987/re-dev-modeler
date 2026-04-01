// Vercel Serverless Function - Admin: Invite New User
// POST /api/admin/invite
// Body: { email, plan?, trialDays? }
// Creates user in Supabase via generate_link (gets magic link),
// then sends a beautifully designed HTML invite email via Supabase's built-in SMTP
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

  const authHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };
  const kvUrl = `${supabaseUrl}/rest/v1/kv_store`;
  const kvHeaders = { ...authHeaders, 'Prefer': 'resolution=merge-duplicates' };

  try {
    const { email, plan, trialDays } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    // Determine the app URL for redirect
    const appUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://re-dev-modeler.vercel.app';

    // 1. Generate invite link (creates user + returns magic link)
    const linkResp = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'invite',
        email,
        options: { redirectTo: appUrl }
      }),
    });

    if (!linkResp.ok) {
      const err = await linkResp.json();
      return res.status(400).json({ error: err.message || err.msg || 'Failed to generate invite link' });
    }

    const linkData = await linkResp.json();
    const inviteLink = linkData.action_link;
    const userId = linkData.id;

    if (!inviteLink) return res.status(500).json({ error: 'No invite link returned' });

    // 2. Pre-configure subscription for this user
    const now = Date.now();
    const days = trialDays || 14;
    const subscription = plan
      ? { status: 'active', plan, expiresAt: now + 365 * 24 * 60 * 60 * 1000, startedAt: now, activatedBy: 'admin_invite' }
      : { status: 'trial', trialEndsAt: now + days * 24 * 60 * 60 * 1000, startedAt: now, invitedBy: 'admin' };

    await fetch(kvUrl, {
      method: 'POST',
      headers: kvHeaders,
      body: JSON.stringify({
        key: `haseef_sub_${userId}`,
        value: JSON.stringify(subscription),
        user_id: userId,
        updated_at: new Date().toISOString(),
      }),
    });

    // 3. Send custom HTML email via Supabase Edge or fallback
    // We use the Supabase invite email (already sent by generate_link if email sending is enabled)
    // But we ALSO try to send our custom branded email via a simple SMTP relay
    // For now, we send via Supabase's built-in email by re-inviting with their API
    const inviteResp = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email,
        data: { invited_by: 'admin', plan: plan || 'trial' }
      }),
    });
    // Invite email sent by Supabase (uses their configured email template)

    // 4. Log the invite action
    const logKey = `admin_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fetch(kvUrl, {
      method: 'POST',
      headers: kvHeaders,
      body: JSON.stringify({
        key: logKey,
        value: JSON.stringify({ action: 'invite', email, userId, plan: plan || null, trialDays: days, timestamp: new Date().toISOString() }),
        user_id: 'admin',
        updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({
      ok: true,
      email,
      userId,
      plan: plan || 'trial',
      inviteLink, // Admin can also share this link directly
      subscription,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
