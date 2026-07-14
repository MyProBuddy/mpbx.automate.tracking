import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'

import Login               from './pages/Login.jsx'
import Hub                 from './pages/Hub.jsx'
import WorkflowSelector    from './pages/WorkflowSelector.jsx'
import OutlookConfigurator from './pages/OutlookConfigurator.jsx'
import GmailConfigurator   from './pages/GmailConfigurator.jsx'
import AddData             from './AddData.jsx'
import Analytics           from './Analytics.jsx'
import CompanyIntel        from './CompanyIntel.jsx'
import Alerts             from './pages/Alerts.jsx'
import Overview           from './pages/Overview.jsx'

function Protected({ children }) {
  const { role } = useAuth()
  return role ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/hub"            element={<Protected><Hub /></Protected>} />
      <Route path="/add-data"       element={<Protected><AddData /></Protected>} />
      <Route path="/workflow"       element={<Protected><WorkflowSelector /></Protected>} />
      <Route path="/workflow/outlook" element={<Protected><OutlookConfigurator /></Protected>} />
      <Route path="/workflow/gmail"   element={<Protected><GmailConfigurator /></Protected>} />
      <Route path="/analytics"      element={<Protected><Analytics /></Protected>} />
      <Route path="/company-intel"  element={<Protected><CompanyIntel /></Protected>} />
      <Route path="/alerts"         element={<Protected><Alerts /></Protected>} />
      <Route path="/overview"       element={<Protected><Overview /></Protected>} />
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
