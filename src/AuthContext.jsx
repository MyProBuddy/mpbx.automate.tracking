import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { syncTokenFromServer, isConnected } from './google.js'
import { pushSessionToStore, pullSessionFromStore, clearSessionFromStore } from './tokenStore.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole]                   = useState(() => localStorage.getItem('wf_auth') || null)
  const [googleConnected, setGoogleConnected] = useState(isConnected())
  const [googleSyncing, setGoogleSyncing] = useState(!isConnected())
  const [authSyncing, setAuthSyncing]     = useState(!localStorage.getItem('wf_auth'))

  const navigate = useNavigate()

  useEffect(() => {
    // sync Google token
    if (isConnected()) {
      setGoogleConnected(true)
      setGoogleSyncing(false)
    } else {
      syncTokenFromServer()
        .then(found => { if (found) setGoogleConnected(true) })
        .catch(() => {})
        .finally(() => setGoogleSyncing(false))
    }

    // sync login session
    if (localStorage.getItem('wf_auth')) {
      setAuthSyncing(false)
    } else {
      pullSessionFromStore().then(savedRole => {
        if (savedRole) {
          localStorage.setItem('wf_auth', savedRole)
          setRole(savedRole)
        }
      }).catch(() => {}).finally(() => setAuthSyncing(false))
    }
  }, [])

  const login = (r) => {
    localStorage.setItem('wf_auth', r)
    setRole(r)
    pushSessionToStore(r)
    navigate('/hub')
  }

  const logout = () => {
    localStorage.removeItem('wf_auth')
    setRole(null)
    clearSessionFromStore()
    navigate('/login')
  }

  const setConnected = (val) => setGoogleConnected(val)

  return (
    <AuthContext.Provider value={{ role, authSyncing, login, logout, googleConnected, googleSyncing, setConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
