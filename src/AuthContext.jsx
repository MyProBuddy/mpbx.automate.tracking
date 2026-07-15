import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { syncTokenFromServer, isConnected } from './google.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('wf_auth') || null)
  const [googleConnected, setGoogleConnected] = useState(isConnected())
  const navigate = useNavigate()

  useEffect(() => {
    if (isConnected()) { setGoogleConnected(true); return }
    syncTokenFromServer().then(found => {
      if (found) {
        console.log('[auth] token synced from server → googleConnected = true')
        setGoogleConnected(true)
      } else {
        console.log('[auth] no token on server')
      }
    }).catch(e => console.error('[auth] sync error', e))
  }, [])

  const login = (r) => {
    localStorage.setItem('wf_auth', r)
    setRole(r)
    navigate('/hub')
  }

  const logout = () => {
    localStorage.removeItem('wf_auth')
    setRole(null)
    navigate('/login')
  }

  const setConnected = (val) => setGoogleConnected(val)

  return (
    <AuthContext.Provider value={{ role, login, logout, googleConnected, setConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
