import { permanentRedirect } from 'next/navigation'

// Journal articles live on the Australian Atlas portal — the canonical home
// for every article is australianatlas.com.au/journal/[slug]. Old vertical
// article URLs 308 there so existing links and search rankings carry over.
export default function ArticleRedirect({ params }) {
  permanentRedirect(`https://www.australianatlas.com.au/journal/${params.slug}`)
}
