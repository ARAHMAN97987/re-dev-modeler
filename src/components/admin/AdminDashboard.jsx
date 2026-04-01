// ═══════════════════════════════════════════════════════════════
// Haseef Admin Dashboard — Phase 1 MVP
// US-1.2.1 Login, US-1.2.2 Overview, US-1.2.3 Users List,
// US-1.2.4 User Detail, US-1.2.5 Subscription Management
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api/admin";

// ── Design tokens (matching Haseef theme) ──
const C = {
  navy: "#0B2341", deep: "#071829", teal: "#2EC4B6", gold: "#C8A96E",
  bg: "#f8f9fb", card: "#fff", border: "#e5e7ec", text: "#1a1d23",
  textSec: "#6b7080", textMuted: "#9ca3af",
  green: "#16a34a", greenBg: "#dcfce7",
  blue: "#2563eb", blueBg: "#dbeafe",
  orange: "#ea580c", orangeBg: "#fff7ed",
  red: "#ef4444", redBg: "#fef2f2",
  gray: "#6b7080", grayBg: "#f3f4f6",
};

const STATUS_COLORS = {
  active: { bg: C.greenBg, color: C.green, label: "Active", labelAr: "نشط" },
  trial: { bg: C.blueBg, color: C.blue, label: "Trial", labelAr: "تجريبي" },
  expired: { bg: C.orangeBg, color: C.orange, label: "Expired", labelAr: "منتهي" },
  none: { bg: C.grayBg, color: C.gray, label: "None", labelAr: "بدون" },
};

// ── Styles ──
const pageS = { minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" };
const headerS = { background: C.navy, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" };
const cardS = { background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20 };
const btnS = { padding: "8px 16px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const btnPrim = { ...btnS, background: C.teal, color: "#fff" };
const btnDanger = { ...btnS, background: C.red, color: "#fff" };
const btnGhost = { ...btnS, background: "transparent", border: `1px solid ${C.border}`, color: C.text };
const inputS = { padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" };
const badgeS = (status) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.none;
  return { fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 4, background: s.bg, color: s.color, whiteSpace: "nowrap" };
};
const thS = { padding: "8px 12px", textAlign: "start", fontSize: 10, fontWeight: 600, color: C.textSec, background: "#f8f9fb", borderBottom: `1px solid ${C.border}`, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" };
const tdS = { padding: "8px 12px", borderBottom: "1px solid #f0f1f5", fontSize: 12, whiteSpace: "nowrap" };

function fmt(d) { if (!d) return "—"; try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; } }
function fmtRel(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}d ago`;
  return fmt(d);
}

// ═══════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════
function AdminLogin({ onLogin }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setError(""); setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/users?page=1&limit=1`, { headers: { "X-Admin-Key": key } });
      if (r.ok) {
        sessionStorage.setItem("haseef_admin_key", key);
        onLogin(key);
      } else {
        setError("Invalid admin key");
      }
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ ...pageS, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...cardS, width: 380, textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.navy, marginBottom: 4, fontFamily: "'Tajawal',sans-serif" }}>حصيف</div>
        <div style={{ fontSize: 13, color: C.textSec, marginBottom: 24 }}>Admin Dashboard</div>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          placeholder="Enter Admin Secret Key"
          style={{ ...inputS, marginBottom: 12 }}
        />
        {error && <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>{error}</div>}
        <button onClick={go} disabled={busy || !key} style={{ ...btnPrim, width: "100%", padding: "10px 0", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Verifying..." : "Login"}
        </button>
        <div style={{ marginTop: 16, fontSize: 10, color: C.textMuted }}>
          <a href="#/" style={{ color: C.teal, textDecoration: "none" }}>← Back to App</a>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// KPI CARDS
// ═══════════════════════════════════════════════════
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ ...cardS, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 10, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SUBSCRIPTION ACTIONS PANEL
// ═══════════════════════════════════════════════════
function SubActions({ user, adminKey, onDone }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const act = async (action, extra = {}) => {
    if (action === "cancel" && !confirm("Cancel this user's subscription? They will lose access immediately.")) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`${API_BASE}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({ userId: user.id, action, ...extra }),
      });
      const d = await r.json();
      if (r.ok) { setMsg(`✓ ${action} successful`); onDone(); }
      else setMsg(`Error: ${d.error}`);
    } catch (e) { setMsg(`Error: ${e.message}`); }
    setBusy(false);
  };

  return (
    <div style={{ ...cardS, marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Subscription Actions</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button style={btnGhost} disabled={busy} onClick={() => act("extend_trial", { days: 7 })}>+7 Days Trial</button>
        <button style={btnGhost} disabled={busy} onClick={() => act("extend_trial", { days: 14 })}>+14 Days</button>
        <button style={btnGhost} disabled={busy} onClick={() => act("extend_trial", { days: 30 })}>+30 Days</button>
        <button style={{ ...btnPrim, background: C.green }} disabled={busy} onClick={() => act("activate", { plan: "starter" })}>Activate Starter</button>
        <button style={btnPrim} disabled={busy} onClick={() => act("activate", { plan: "growth" })}>Activate Growth</button>
        <button style={{ ...btnPrim, background: C.gold }} disabled={busy} onClick={() => act("activate", { plan: "pro" })}>Activate Pro</button>
        <button style={btnDanger} disabled={busy} onClick={() => act("cancel")}>Cancel</button>
      </div>
      {msg && <div style={{ fontSize: 11, marginTop: 8, color: msg.startsWith("✓") ? C.green : C.red }}>{msg}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// USER DETAIL PANEL
// ═══════════════════════════════════════════════════
function UserDetail({ userId, adminKey, onClose, onOpenProject }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/users?id=${userId}`, { headers: { "X-Admin-Key": adminKey } });
      if (r.ok) setUser(await r.json());
    } catch {}
    setLoading(false);
  }, [userId, adminKey]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ ...cardS, textAlign: "center", color: C.textSec }}>Loading...</div>;
  if (!user) return <div style={{ ...cardS, color: C.red }}>User not found</div>;

  const sub = user.subscription;
  const subStatus = sub ? (sub.status === "active" && sub.expiresAt > Date.now() ? "active" : sub.status === "trial" && sub.trialEndsAt > Date.now() ? "trial" : sub.trialEndsAt && sub.trialEndsAt <= Date.now() ? "expired" : sub.status || "none") : "none";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onClose} style={{ ...btnGhost, padding: "4px 10px" }}>← Back</button>
        <div style={{ fontSize: 15, fontWeight: 600 }}>User Detail</div>
      </div>

      <div style={cardS}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: C.textSec, fontWeight: 600, textTransform: "uppercase" }}>Email</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{user.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textSec, fontWeight: 600, textTransform: "uppercase" }}>Status</div>
            <span style={badgeS(subStatus)}>{STATUS_COLORS[subStatus]?.label || subStatus}</span>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textSec, fontWeight: 600, textTransform: "uppercase" }}>Signed Up</div>
            <div style={{ fontSize: 12 }}>{fmt(user.created_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textSec, fontWeight: 600, textTransform: "uppercase" }}>Last Login</div>
            <div style={{ fontSize: 12 }}>{fmtRel(user.last_sign_in_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textSec, fontWeight: 600, textTransform: "uppercase" }}>Plan</div>
            <div style={{ fontSize: 12 }}>{sub?.plan || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textSec, fontWeight: 600, textTransform: "uppercase" }}>Expiry</div>
            <div style={{ fontSize: 12 }}>{sub?.expiresAt ? fmt(sub.expiresAt) : sub?.trialEndsAt ? fmt(sub.trialEndsAt) : "—"}</div>
          </div>
        </div>
      </div>

      <SubActions user={user} adminKey={adminKey} onDone={load} />

      {/* Projects list */}
      {user.projects?.length > 0 && (
        <div style={{ ...cardS, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Projects ({user.projectCount})</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Name", "Mode", "Assets", "Updated", ""].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {user.projects.map(p => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => onOpenProject(p.id, user.id, user.email)}>
                  <td style={{ ...tdS, fontWeight: 500 }}>{p.name}</td>
                  <td style={tdS}>{p.finMode || "—"}</td>
                  <td style={tdS}>{p.assetCount || 0}</td>
                  <td style={tdS}>{fmtRel(p.updatedAt)}</td>
                  <td style={{ ...tdS, textAlign: "center" }}>
                    <button style={{ ...btnGhost, padding: "2px 8px", fontSize: 10 }}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ═══════════════════════════════════════════════════
export default function AdminDashboard({ onOpenProject, onExit }) {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("haseef_admin_key") || "");
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("overview"); // overview | users | user-detail | logs
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Verify stored key on mount
  useEffect(() => {
    if (!adminKey) return;
    fetch(`${API_BASE}/users?page=1&limit=1`, { headers: { "X-Admin-Key": adminKey } })
      .then(r => { if (r.ok) setAuthed(true); else { setAdminKey(""); sessionStorage.removeItem("haseef_admin_key"); } })
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/users?page=${currentPage}&limit=50`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      const r = await fetch(url, { headers: { "X-Admin-Key": adminKey } });
      if (r.ok) {
        const d = await r.json();
        setUsers(d.users || []);
        setTotalUsers(d.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [adminKey, currentPage, search, statusFilter]);

  useEffect(() => { if (authed) fetchUsers(); }, [authed, fetchUsers]);

  // Activity logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      // Fetch admin_log_* keys from kv_store via the export-project API
      const r = await fetch(`/api/export-project`, { headers: { "X-Admin-Key": adminKey } });
      if (r.ok) {
        const d = await r.json();
        const logKeys = (d.keys || []).filter(k => k.key.startsWith("admin_log_"));
        // Fetch each log entry
        const entries = [];
        for (const lk of logKeys.slice(0, 50)) {
          try {
            const lr = await fetch(`/api/export-project?key=${encodeURIComponent(lk.key)}`, { headers: { "X-Admin-Key": adminKey } });
            if (lr.ok) {
              const ld = await lr.json();
              if (ld.parsed) entries.push(ld.parsed);
              else if (ld.value) try { entries.push(JSON.parse(ld.value)); } catch {}
            }
          } catch {}
        }
        entries.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        setLogs(entries);
      }
    } catch {}
    setLogsLoading(false);
  }, [adminKey]);

  // Export users to CSV
  const exportCSV = useCallback(() => {
    const headers = ["Email", "Status", "Plan", "Projects", "Signed Up", "Last Active"];
    const rows = users.map(u => [
      u.email,
      u.subscription?.status || "none",
      u.subscription?.plan || "",
      u.projectCount || 0,
      u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "",
      u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString().split("T")[0] : "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `haseef-users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [users]);

  if (!authed) return <AdminLogin onLogin={(k) => { setAdminKey(k); setAuthed(true); }} />;

  const logout = () => { sessionStorage.removeItem("haseef_admin_key"); setAdminKey(""); setAuthed(false); };

  // Compute KPIs from loaded users
  const kpiActive = users.filter(u => u.subscription?.status === "active").length;
  const kpiTrial = users.filter(u => u.subscription?.status === "trial").length;
  const kpiExpired = users.filter(u => u.subscription?.status === "expired").length;
  const kpiProjects = users.reduce((s, u) => s + (u.projectCount || 0), 0);

  return (
    <div style={pageS}>
      {/* Header */}
      <div style={headerS}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Tajawal',sans-serif" }}>حصيف</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>Admin Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => { setPage("overview"); setSelectedUserId(null); }} style={{ ...btnGhost, color: page === "overview" ? C.teal : "#fff", borderColor: "transparent", fontSize: 11 }}>Overview</button>
          <button onClick={() => { setPage("users"); setSelectedUserId(null); }} style={{ ...btnGhost, color: page === "users" ? C.teal : "#fff", borderColor: "transparent", fontSize: 11 }}>Users</button>
          <button onClick={() => { setPage("logs"); fetchLogs(); }} style={{ ...btnGhost, color: page === "logs" ? C.teal : "#fff", borderColor: "transparent", fontSize: 11 }}>Activity Log</button>
          {onExit && <button onClick={onExit} style={{ ...btnGhost, color: "#fff", borderColor: "rgba(255,255,255,0.2)", fontSize: 11 }}>← Exit Admin</button>}
          <button onClick={logout} style={{ ...btnGhost, color: C.red, borderColor: "rgba(239,68,68,0.3)", fontSize: 11 }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        {/* ── OVERVIEW PAGE ── */}
        {page === "overview" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Dashboard Overview</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <KpiCard label="Total Users" value={totalUsers} />
              <KpiCard label="Active Subscriptions" value={kpiActive} color={C.green} />
              <KpiCard label="Active Trials" value={kpiTrial} color={C.blue} />
              <KpiCard label="Expired Trials" value={kpiExpired} color={C.orange} />
              <KpiCard label="Total Projects" value={kpiProjects} color={C.navy} />
            </div>

            {/* Recent signups */}
            <div style={cardS}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recent Signups</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Email", "Status", "Projects", "Signed Up", "Last Active"].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map(u => (
                    <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => { setSelectedUserId(u.id); setPage("user-detail"); }}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{u.email}</td>
                      <td style={tdS}><span style={badgeS(u.subscription?.status || "none")}>{STATUS_COLORS[u.subscription?.status]?.label || "None"}</span></td>
                      <td style={tdS}>{u.projectCount || 0}</td>
                      <td style={tdS}>{fmt(u.created_at)}</td>
                      <td style={tdS}>{fmtRel(u.last_sign_in_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length > 10 && (
                <div style={{ textAlign: "center", paddingTop: 12 }}>
                  <button onClick={() => setPage("users")} style={{ ...btnGhost, fontSize: 11 }}>View All Users →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS LIST PAGE ── */}
        {page === "users" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Users ({totalUsers})</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by email..."
                  style={{ ...inputS, width: 220 }}
                />
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  style={{ ...inputS, width: 120 }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="expired">Expired</option>
                  <option value="none">None</option>
                </select>
                <button onClick={fetchUsers} style={btnPrim} disabled={loading}>
                  {loading ? "..." : "Refresh"}
                </button>
                <button onClick={exportCSV} style={{ ...btnGhost, fontSize: 11 }} title="Export to CSV">
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div style={cardS}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Email", "Status", "Plan", "Projects", "Signed Up", "Last Active"].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => { setSelectedUserId(u.id); setPage("user-detail"); }}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{u.email}</td>
                      <td style={tdS}><span style={badgeS(u.subscription?.status || "none")}>{STATUS_COLORS[u.subscription?.status]?.label || "None"}</span></td>
                      <td style={tdS}>{u.subscription?.plan || "—"}</td>
                      <td style={tdS}>{u.projectCount || 0}</td>
                      <td style={tdS}>{fmt(u.created_at)}</td>
                      <td style={tdS}>{fmtRel(u.last_sign_in_at)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} style={{ ...tdS, textAlign: "center", color: C.textMuted }}>
                      {loading ? "Loading..." : "No users found"}
                    </td></tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, paddingTop: 12 }}>
                <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} style={{ ...btnGhost, padding: "4px 12px", fontSize: 11 }}>← Prev</button>
                <span style={{ fontSize: 11, color: C.textSec, padding: "6px 0" }}>Page {currentPage}</span>
                <button disabled={users.length < 50} onClick={() => setCurrentPage(p => p + 1)} style={{ ...btnGhost, padding: "4px 12px", fontSize: 11 }}>Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── USER DETAIL PAGE ── */}
        {page === "user-detail" && selectedUserId && (
          <UserDetail
            userId={selectedUserId}
            adminKey={adminKey}
            onClose={() => { setSelectedUserId(null); setPage("users"); }}
            onOpenProject={(projectId, ownerId, ownerEmail) => onOpenProject?.(projectId, ownerId, ownerEmail)}
          />
        )}

        {/* ── ACTIVITY LOG PAGE ── */}
        {page === "logs" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Activity Log</div>
              <button onClick={fetchLogs} style={btnPrim} disabled={logsLoading}>{logsLoading ? "Loading..." : "Refresh"}</button>
            </div>
            <div style={cardS}>
              {logs.length === 0 && !logsLoading && (
                <div style={{ textAlign: "center", padding: 32, color: C.textMuted, fontSize: 13 }}>No admin actions logged yet. Actions like subscription changes will appear here.</div>
              )}
              {logs.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["Time", "Action", "User ID", "Plan", "Days", "Details"].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i}>
                        <td style={tdS}>{log.timestamp ? fmtRel(log.timestamp) : "—"}</td>
                        <td style={tdS}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                            background: log.action === "activate" ? C.greenBg : log.action === "cancel" ? C.redBg : log.action === "extend_trial" ? C.blueBg : C.grayBg,
                            color: log.action === "activate" ? C.green : log.action === "cancel" ? C.red : log.action === "extend_trial" ? C.blue : C.gray,
                          }}>{log.action}</span>
                        </td>
                        <td style={{ ...tdS, fontSize: 10, fontFamily: "monospace" }}>{log.userId?.slice(0, 8)}...</td>
                        <td style={tdS}>{log.plan || "—"}</td>
                        <td style={tdS}>{log.days || "—"}</td>
                        <td style={{ ...tdS, fontSize: 10, color: C.textMuted }}>
                          {log.previous?.status ? `was: ${log.previous.status}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
