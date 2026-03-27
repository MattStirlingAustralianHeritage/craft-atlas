'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { getSupabase } from '@/lib/supabase'

const AuthContext = createContext(null)
export function useAuth() { return useContext(AuthContext) }

export default function VendorLayout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
