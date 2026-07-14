import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('wf_auth') || null)
  const navigate = useNavigate()

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

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
