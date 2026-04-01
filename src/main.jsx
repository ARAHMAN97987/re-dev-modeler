import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './styles/design-tokens.css'
import { AuthGate } from './lib/auth.jsx'
import { storage } from './lib/storage'
import App from './App.jsx'
import AdminDashboard from './components/admin/AdminDashboard.jsx'
import TermsOfService from './components/admin/TermsOfService.jsx'

// ── Admin Project Viewer wrapper ──
function AdminProjectViewer({ projectId }) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ ownerEmail: '', ownerId: '' });
  const adminKey = sessionStorage.getItem('haseef_admin_key');

  useEffect(() => {
    if (!adminKey || !projectId) { setError('Not authenticated'); setLoading(false); return; }
    fetch(`/api/admin/projects?id=${projectId}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(d => {
        const p = d.project;
        // Mark as admin read-only view
        p._permission = 'view';
        p._adminView = true;
        p._shared = true; // prevents save attempts
        p._ownerId = d.userId;
        setProject(p);
        setMeta({ ownerEmail: d.ownerEmail || '', ownerId: d.userId || '' });
        // Set storage userId to owner so the engine can access their data context
        storage.setUserId(d.userId || 'anonymous');
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [projectId, adminKey]);

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f9fb',fontFamily:"'DM Sans',sans-serif"}}>
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:20,fontWeight:900,color:'#0B2341',fontFamily:"'Tajawal',sans-serif",marginBottom:8}}>حصيف</div>
      <div style={{fontSize:12,color:'#6b7080'}}>Loading project...</div>
    </div>
  </div>;

  if (error) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f9fb',fontFamily:"'DM Sans',sans-serif"}}>
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:14,color:'#ef4444',marginBottom:12}}>Error: {error}</div>
      <button onClick={() => { window.location.hash = '#/admin'; }} style={{padding:'8px 16px',background:'#2EC4B6',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:12}}>← Back to Admin</button>
    </div>
  </div>;

  return (
    <div>
      {/* Admin banner */}
      <div style={{background:'#1e40af',color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12,fontFamily:"'DM Sans',sans-serif",zIndex:9999,position:'sticky',top:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontWeight:700}}>Admin View — Read Only</span>
          <span style={{opacity:0.7}}>User: {meta.ownerEmail}</span>
          <span style={{opacity:0.7}}>Project: {project?.name}</span>
        </div>
        <button onClick={() => { window.location.hash = '#/admin'; }} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:4,color:'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
          Exit Admin View
        </button>
      </div>
      {/* Render the actual App with the loaded project */}
      <App
        user={null}
        signOut={null}
        adminProject={project}
        readOnly={true}
      />
    </div>
  );
}

function Root() {
  const [route, setRoute] = useState(() => {
    const h = window.location.hash.replace(/^#\/?/, '');
    if (h.startsWith('admin/project/')) return 'admin-project';
    if (h === 'admin' || h.startsWith('admin/')) return 'admin';
    if (h === 'terms') return 'terms';
    return 'app';
  });
  const [adminProjectId, setAdminProjectId] = useState(() => {
    const h = window.location.hash.replace(/^#\/?/, '');
    const m = h.match(/^admin\/project\/(.+)/);
    return m ? m[1] : null;
  });

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      const m = h.match(/^admin\/project\/(.+)/);
      if (m) { setRoute('admin-project'); setAdminProjectId(m[1]); }
      else if (h === 'admin' || h.startsWith('admin/')) setRoute('admin');
      else if (h === 'terms') setRoute('terms');
      else setRoute('app');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'terms') {
    return <TermsOfService onBack={() => { window.location.hash = '#/'; }} />;
  }

  if (route === 'admin-project' && adminProjectId) {
    return <AdminProjectViewer projectId={adminProjectId} />;
  }

  if (route === 'admin') {
    return <AdminDashboard
      onOpenProject={(projectId, ownerId, ownerEmail) => {
        window.location.hash = `#/admin/project/${projectId}`;
      }}
      onExit={() => { window.location.hash = '#/'; }}
    />;
  }

  return (
    <AuthGate>
      {({ user, userId, signOut, publicAcademy, exitAcademy }) => {
        storage.setUserId(userId || 'anonymous')
        return <App user={user} signOut={signOut} publicAcademy={publicAcademy} exitAcademy={exitAcademy} />
      }}
    </AuthGate>
  )
}

// Force light mode — dark mode disabled
document.documentElement.setAttribute('data-theme', 'light');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
