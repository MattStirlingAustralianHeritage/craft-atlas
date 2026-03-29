'use client'

import { useState } from 'react'

export default function UpgradeButton({ venueId, userId, currentTier, className = '' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Don't show if already on standard
  if (currentTier === 'standard') return null

  const label = 'Upgrade to Standard'
  const price = '$99/year'
  const priceId = process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, venueId, userId, tier: 'standard' }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to create checkout session')

      if (data.url) window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed bg-[#C1603A] hover:bg-[#a8512f] text-white ${className}`}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Redirecting to checkout…
          </>
        ) : (
          <>
            {label}
            <span className="opacity-80 font-normal">{price}</span>
          </>
        )}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
