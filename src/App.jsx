import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import MeshBackground from './components/MeshBackground.jsx'

import Login               from './pages/Login.jsx'
import Hub                 from './pages/Hub.jsx'
import WorkflowSelector    from './pages/WorkflowSelector.jsx'
import OutlookConfigurator from './pages/OutlookConfigurator.jsx'
import GmailConfigurator   from './pages/GmailConfigurator.jsx'
import AddData             from './AddData.jsx'
import Analytics           from './Analytics.jsx'
import CompanyIntel        from './CompanyIntel.jsx'
import Alerts              from './pages/Alerts.jsx'
import Overview            from './pages/Overview.jsx'
import Home                from './pages/Home.jsx'
import NNav               from './components/NNav.jsx'

// /n/* stub — uses NNav, independent from old pages
function NSectionStub({ title }) {
  return (
    <div style={{
      fontFamily: "'Urbanist', sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff8f4 0%, #ffe1be 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(126,108,212,0.22) 0%, rgba(255,255,255,0) 70%)',
      }} />
      <NNav />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: 120, position: 'relative', zIndex: 1,
      }}>
        <p style={{ fontSize: 15, color: '#7C7C94', fontFamily: "'Urbanist', sans-serif" }}>
          {title} — coming soon
        </p>
      </div>
    </div>
  )
}

function Protected({ children }) {
  const { role, authSyncing } = useAuth()
  if (authSyncing) return null
  return role ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/hub"              element={<Protected><Hub /></Protected>} />
      <Route path="/add-data"         element={<Protected><AddData /></Protected>} />
      <Route path="/workflow"         element={<Protected><WorkflowSelector /></Protected>} />
      <Route path="/workflow/outlook" element={<Protected><OutlookConfigurator /></Protected>} />
      <Route path="/workflow/gmail"   element={<Protected><GmailConfigurator /></Protected>} />
      <Route path="/analytics"        element={<Protected><Analytics /></Protected>} />
      <Route path="/company-intel"    element={<Protected><CompanyIntel /></Protected>} />
      <Route path="/alerts"           element={<Protected><Alerts /></Protected>} />
      <Route path="/overview"         element={<Protected><Overview /></Protected>} />
      <Route path="/home"             element={<Protected><Home /></Protected>} />
      {/* New /n/* routes — independent from old pages */}
      <Route path="/n/overview"  element={<Protected><NSectionStub title="Overview" /></Protected>} />
      <Route path="/n/analytics" element={<Protected><NSectionStub title="Analytics" /></Protected>} />
      <Route path="/n/alerts"    element={<Protected><NSectionStub title="Alerts" /></Protected>} />
      <Route path="/n/tools"     element={<Protected><NSectionStub title="Tools" /></Protected>} />
      <Route path="/n/settings"  element={<Protected><NSectionStub title="Settings" /></Protected>} />
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <MeshBackground />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <AppRoutes />
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
