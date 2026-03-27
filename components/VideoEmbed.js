'use client'
import { getEmbedUrl } from '@/lib/video-embed'

export default function VideoEmbed({ url, title = 'Venue video' }) {
  const embedUrl = getEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <div style={{
      position: 'relative', width: '100%', paddingBottom: '56.25%',
      backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden',
    }}>
      <iframe src={embedUrl} title={title} style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none',
      }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  )
}
