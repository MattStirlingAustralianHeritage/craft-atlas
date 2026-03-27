export function parseVideoUrl(url) {
  if (!url) return { platform: null, id: null }
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return { platform: 'youtube', id: ytMatch[1] }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] }
  return { platform: null, id: null }
}

export function getEmbedUrl(url) {
  const { platform, id } = parseVideoUrl(url)
  if (platform === 'youtube') return `https://www.youtube.com/embed/${id}`
  if (platform === 'vimeo') return `https://player.vimeo.com/video/${id}`
  return null
}

export function isValidVideoUrl(url) {
  const { platform } = parseVideoUrl(url)
  return platform !== null
}
