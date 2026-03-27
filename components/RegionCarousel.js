'use client'
import { useEffect } from 'react'

export default function RegionCarousel() {
  useEffect(() => {
    const track = document.getElementById('regionsTrack')
    if (!track) return

    document.getElementById('regionsNext')?.addEventListener('click', () => {
      track.scrollBy({ left: 580, behavior: 'smooth' })
    })
    document.getElementById('regionsPrev')?.addEventListener('click', () => {
      track.scrollBy({ left: -580, behavior: 'smooth' })
    })

    let isDown = false, startX, scrollLeft
    track.addEventListener('mousedown', e => {
      isDown = true
      startX = e.pageX - track.offsetLeft
      scrollLeft = track.scrollLeft
    })
    track.addEventListener('mouseleave', () => isDown = false)
    track.addEventListener('mouseup', () => isDown = false)
    track.addEventListener('mousemove', e => {
      if (!isDown) return
      e.preventDefault()
      track.scrollLeft = scrollLeft - (e.pageX - track.offsetLeft - startX) * 1.4
    })
  }, [])

  return null
}
