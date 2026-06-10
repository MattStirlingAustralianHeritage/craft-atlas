'use client'

import { useState } from 'react'

export default function UpgradeButton({ venueId, userId, currentTier, className = '' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Don't show if already on standard
  if (currentTier === 'standard') return null

  const label = 'Upgrade to Standard'
  const price = '$295/year'
  const priceId = process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID

  const handleUpgrade = () => {
    // Billing is centralised on the Portal — upgrades go through the $295 claim flow.
    window.location.href = 'https://www.australianatlas.com.au/claim'
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
