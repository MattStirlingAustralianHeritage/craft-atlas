import { redirect } from 'next/navigation'

export default async function RedirectPage() {
  redirect('https://www.australianatlas.com.au/for-venues?vertical=craft')
}
