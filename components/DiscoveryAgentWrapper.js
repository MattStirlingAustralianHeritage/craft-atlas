'use client'
import { usePathname } from 'next/navigation'
import DiscoveryAgent from './DiscoveryAgent'

export default function DiscoveryAgentWrapper() {
  const pathname = usePathname()
  if (pathname === '/map') return null
  return <DiscoveryAgent />
}
