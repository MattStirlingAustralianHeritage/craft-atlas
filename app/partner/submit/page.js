'use client'

import { useEffect, useState, useCallback, useRef , Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import WYSIWYGEditor, { htmlToMd, mdToHtml } from '@/components/WYSIWYGEditor'

const REGIONS = [
  'Yarra Valley & Dandenong Ranges',
  'Mornington Peninsula',
  'Great Ocean Road',
  'Macedon Ranges',
  'Grampians',
  'Murray River & Rutherglen',
  'Gippsland',
  'North East Victoria',
  'Geelong & The Bellarine',
  'High Country',
  'Sunraysia',
  'Melbourne Metro',
  'Barossa Valley',
  'Clare Valley',
  'McLaren Vale',
  'Adelaide Hills',
  'Coonawarra',
  'Hunter Valley',
  'Margaret River',
  'Tasmania',
  'Other / National',
]

function PreviewPane({ title, excerpt, bodyMd, region, vertical, heroImageUrl, orgName }) {
  const bodyHtml = mdToHtml(bodyMd)
  const hasContent = title || excerpt || bodyMd?.trim()

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '20px', fontWeight: '600', paddingBottom: '12px', borderBottom: '1px solid #1e1e1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Live Preview</span>
        <span style={{ color: 'var(--text-3)' }}>Journal · Article View</span>
      </div>
      {!hasContent ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Start writing to see your preview</p>
        </div>
      ) : (
        <article>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {vertical && <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C1603A', fontWeight: '600' }}>{vertical}</span>}
            {region && <span style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--text-3)' }}>{region}</span>}
          </div>
          {title && <h1 style={{ fontSize: '22px', fontWeight: '300', lineHeight: '1.3', color: 'var(--text)', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>{title}</h1>}
          {excerpt && <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-2)', margin: '0 0 24px 0', borderLeft: '2px solid #C1603A', paddingLeft: '16px', fontStyle: 'italic' }}>{excerpt}</p>}
          {heroImageUrl && (
            <div style={{ marginBottom: '24px', aspectRatio: '16/9', background: '#1a1a18', borderRadius: '2px', overflow: 'hidden' }}>
              <img src={heroImageUrl} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
            </div>
          )}
          {bodyHtml && <div className="preview-body" style={{ fontSize: '14px', lineHeight: '1.75', color: 'var(--text-2)' }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #1e1e1c' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.04em', lineHeight: '1.6', margin: 0 }}>
              <span style={{ color: '#C1603A', fontWeight: '600' }}>Partner content.</span>{' '}
              Produced in partnership with {orgName || '[Organisation]'}. Editorial standards apply.
            </p>
          </div>
          <style>{`
            .preview-body h2 { font-size:17px; font-weight:500; color:#e8e4dc; margin:28px 0 12px; }
            .preview-body h3 { font-size:11px; font-weight:700; color:#ccc; margin:24px 0 10px; letter-spacing:0.08em; text-transform:uppercase; }
            .preview-body p { margin:0 0 16px; }
            .preview-body ul, .preview-body ol { padding-left:20px; margin-bottom:16px; }
            .preview-body li { margin-bottom:6px; }
            .preview-body blockquote { border-left:2px solid #C1603A; padding-left:16px; margin:24px 0; font-style:italic; color:#aaa; }
            .preview-body strong { color:#e8e4dc; font-weight:600; }
            .preview-body a { color:#C1603A; }
            .preview-body hr { border:none; border-top:1px solid #1e1e1c; margin:28px 0; }
            .preview-body figure img { max-width:100%; border-radius:2px; }
          `}</style>
        </article>
      )}
    </div>
  )
}

function PartnerSubmit() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('id')
  const supabase = getSupabase()
  const editorWrapRef = useRef(null)

  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [region, setRegion] = useState('')
  const [vertical, setVertical] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [currentSubId, setCurrentSubId] = useState(submissionId || null)
  const [initialBody, setInitialBody] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p, error: pErr } = await supabase.from('partners').select('*').eq('user_id', user.id).single()
      if (pErr || !p) { setError('No partner account found.'); setLoading(false); return }
      setPartner(p)
      if (submissionId) {
        const { data: sub } = await supabase.from('partner_submissions').select('*').eq('id', submissionId).eq('partner_id', p.id).single()
        if (sub) {
          setTitle(sub.title || ''); setExcerpt(sub.excerpt || ''); setRegion(sub.region || '')
          setVertical(sub.vertical || ''); setHeroImageUrl(sub.hero_image_url || '')
          setInitialBody(sub.body || ''); setBodyMd(sub.body || ''); setCurrentSubId(sub.id)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function getCurrentBody() {
    const editorEl = editorWrapRef.current?.querySelector('[contenteditable]')
    return editorEl ? htmlToMd(editorEl) : bodyMd
  }

  const saveDraft = useCallback(async (andSubmit = false) => {
    if (!partner) return
    setSaving(true); setSaved(false); setError(null)
    const body = getCurrentBody()
    const payload = {
      partner_id: partner.id, title, excerpt, body, region, vertical,
      hero_image_url: heroImageUrl,
      status: andSubmit ? 'under_review' : 'draft',
      ...(andSubmit ? { submitted_at: new Date().toISOString() } : {}),
    }
    let result
    if (currentSubId) {
      result = await supabase.from('partner_submissions').update(payload).eq('id', currentSubId).select().single()
    } else {
      result = await supabase.from('partner_submissions').insert(payload).select().single()
    }
    if (result.error) {
      setError('Failed to save. Please try again.')
    } else {
      setCurrentSubId(result.data.id)
      if (andSubmit) {
        router.push('/partner')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    }
    setSaving(false)
  }, [partner, title, excerpt, region, vertical, heroImageUrl, currentSubId])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setError('Please add a title before submitting.'); return }
    if (!vertical) { setError('Please select a vertical.'); return }
    setSubmitting(true)
    await saveDraft(true)
    setSubmitting(false)
  }, [saveDraft, title, vertical])

  useEffect(() => {
    if (!partner || loading || showSuccess) return
    const t = setTimeout(() => saveDraft(false), 2000)
    return () => clearTimeout(t)
  }, [title, excerpt, region, vertical, heroImageUrl, showSuccess])

  function handleEditorChange() {
    const editorEl = editorWrapRef.current?.querySelector('[contenteditable]')
    if (editorEl) setBodyMd(htmlToMd(editorEl))
  }

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 14px', fontSize: '14px', borderRadius: '2px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px', fontWeight: '600' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading…</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Success modal */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid #2a2a28', borderRadius: '4px', padding: '48px 56px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px', color: '#5a9e6f' }}>✓</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '400', color: 'var(--text)', margin: '0 0 12px 0', letterSpacing: '-0.01em' }}>Submission received</h2>
            <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.6', margin: 0, fontFamily: 'var(--font-sans)' }}>Thank you — we'll review your piece and be in touch shortly.</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #1e1e1c', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/partner" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>← Dashboard</span>
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>New Submission</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {saved && !saving && <span style={{ fontSize: '11px', color: '#5a9e6f' }}>✓ Saved</span>}
          {saving && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Saving…</span>}
          {error && <span style={{ fontSize: '11px', color: '#c05353' }}>{error}</span>}
          <button onClick={handleSubmit} disabled={submitting} style={{ background: submitting ? '#555' : '#C1603A', color: '#111110', border: 'none', padding: '9px 20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer', borderRadius: '2px' }}>
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>

        {/* LEFT: Editor */}
        <div style={{ borderRight: '1px solid #1a1a18', overflowY: 'auto', padding: '40px 40px 80px 40px' }}>
          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C1603A', fontWeight: '600', margin: '0 0 6px 0' }}>{partner?.org_name}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>Partner editorial submission</p>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="A working title for your piece" style={{ ...inputStyle, fontSize: '18px', fontWeight: '300', padding: '14px' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Standfirst / Excerpt</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="A sentence or two that draws the reader in." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Vertical</label>
              <select value={vertical} onChange={e => setVertical(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select vertical</option>
                {(partner?.verticals || []).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select region</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={labelStyle}>Hero Image URL</label>
            <input type="url" value={heroImageUrl} onChange={e => setHeroImageUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
            <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px' }}>Link to an externally hosted image. Recommended ratio: 16:9.</p>
          </div>
          <div>
            <label style={labelStyle}>Body</label>
            <div ref={editorWrapRef} onKeyUp={handleEditorChange} onMouseUp={handleEditorChange}>
              <WYSIWYGEditor value={initialBody} onUploadImage={async () => null} uploading={false} />
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div style={{ overflowY: 'auto', padding: '40px', background: 'var(--bg-2)' }}>
          <PreviewPane title={title} excerpt={excerpt} bodyMd={bodyMd} region={region} vertical={vertical} heroImageUrl={heroImageUrl} orgName={partner?.org_name} />
        </div>

      </div>
    </div>
  )
}

export default function PartnerSubmitWrapper() {
  return <Suspense fallback={null}><PartnerSubmit /></Suspense>
}
