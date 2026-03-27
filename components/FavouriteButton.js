'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'
import AuthModal from './AuthModal'

export default function FavouriteButton({ venueId, venueName }) {
  const [user, setUser] = useState(null)
  const [isFavourited, setIsFavourited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          const { data } = await supabase
            .from('favourites')
            .select('id')
            .eq('user_id', user.id)
            .eq('venue_id', venueId)
            .maybeSingle()
          setIsFavourited(!!data)
        }
      } catch (err) {
        console.error('FavouriteButton init failed:', err)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            const { data } = await supabase
              .from('favourites')
              .select('id')
              .eq('user_id', session.user.id)
              .eq('venue_id', venueId)
              .maybeSingle()
            setIsFavourited(!!data)
          } catch (err) {
            console.error('FavouriteButton auth state check failed:', err)
          }
        } else {
          setIsFavourited(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [venueId])

  async function handleToggle() {
    if (!user) {
      setAuthOpen(true)
      return
    }

    const supabase = getSupabase()
    setLoading(true)

    try {
      if (isFavourited) {
        const { error } = await supabase
          .from('favourites')
          .delete()
          .eq('user_id', user.id)
          .eq('venue_id', venueId)
        if (error) throw error
        setIsFavourited(false)
      } else {
        const { error } = await supabase
          .from('favourites')
          .insert({ user_id: user.id, venue_id: venueId })
        if (error) throw error
        setIsFavourited(true)
      }
    } catch (err) {
      console.error('Favourite toggle failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-label={isFavourited ? `Remove ${venueName} from saved` : `Save ${venueName}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: isFavourited ? 'rgba(192,75,75,0.06)' : 'transparent',
          color: isFavourited ? '#c04b4b' : 'var(--text-2)',
          border: `1px solid ${isFavourited ? 'rgba(192,75,75,0.25)' : 'var(--border-2)'}`,
          padding: '12px 20px', borderRadius: 2, fontSize: 12, fontWeight: 600,
          textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase',
          fontFamily: 'var(--font-sans)', cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.5 : 1, transition: 'all 0.15s ease',
        }}
      >
        {isFavourited ? '♥' : '♡'} {isFavourited ? 'Saved' : 'Save'}
      </button>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo={typeof window !== 'undefined' ? window.location.href : undefined}
      />
    </>
  )
}