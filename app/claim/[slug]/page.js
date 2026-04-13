import { redirect } from 'next/navigation'

export default async function RedirectPage({ params }) {
  const { slug } = await params
  redirect(`https://www.australianatlas.com.au/claim/${slug}`)
}
