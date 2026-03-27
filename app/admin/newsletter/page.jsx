'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const amber = '#b8862b'
const bg = '#faf8f5'
const cardBg = '#f5f2ed'
const border = '#e5e0d8'
const text = '#1a1a1a'
const muted = '#888'

export default function NewsletterAdmin() {
  const [draft, setDraft] = useState(null)
  const [articles, setArticles] = useState([])
  const [issues, setIssues] = useState([])
  const [subscribers, setSubscribers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load draft issue
      const { data: draftIssue } = await supabase
        .from('newsletter_issues')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setDraft(draftIssue || null)

      // Load articles for draft
      if (draftIssue) {
        const { data: issueArticles } = await supabase
          .from('newsletter_issue_articles')
          .select('position, articles(id, title, slug, deck, excerpt, is_partner_content, published_at)')
          .eq('issue_id', draftIssue.id)
          .order('position')
        setArticles(issueArticles?.map(ia => ia.articles) || [])
      }

      // Load sent issues history
      const { data: sentIssues } = await supabase
        .from('newsletter_issues')
        .select('id, subject, sent_at, status')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(10)
      setIssues(sentIssues || [])

      // Subscriber count
      const { count } = await supabase
        .from('subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
      setSubscribers(count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function generateDraft() {
    setGenerating(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/newsletter/generate-draft?key=${prompt('Admin password:')}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Draft generated successfully.' })
        await loadData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate draft.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setGenerating(false)
    }
  }

  async function sendIssue() {
    if (!draft) return
    if (!confirm(`Send "${draft.subject}" to ${subscribers} subscribers?`)) return
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/newsletter/send?key=${prompt('Admin password:')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: draft.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: `Sent to ${data.sent} subscribers. ${data.failed > 0 ? `${data.failed} failed.` : ''}` })
        setDraft(null)
        setArticles([])
        await loadData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSending(false)
    }
  }

  async function updateDraftField(field, value) {
    if (!draft) return
    setDraft(prev => ({ ...prev, [field]: value }))
    await supabase
      .from('newsletter_issues')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', draft.id)
  }

  const s = {
    page: { minHeight: '100vh', background: bg, padding: '40px', fontFamily: 'Georgia, serif', color: text },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '20px', borderBottom: `2px solid ${text}` },
    h1: { fontSize: '22px', fontWeight: 'normal', margin: 0 },
    stat: { textAlign: 'right' },
    statNum: { fontSize: '28px', fontWeight: 'normal', color: amber, display: 'block' },
    statLabel: { fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: muted },
    card: { background: cardBg, border: `1px solid ${border}`, padding: '28px', marginBottom: '24px' },
    cardTitle: { fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: muted, margin: '0 0 16px' },
    input: { width: '100%', padding: '10px 14px', fontSize: '15px', border: `1px solid ${border}`, background: '#fff', color: text, fontFamily: 'Georgia, serif', boxSizing: 'border-box', marginBottom: '12px' },
    textarea: { width: '100%', padding: '10px 14px', fontSize: '15px', border: `1px solid ${border}`, background: '#fff', color: text, fontFamily: 'Georgia, serif', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical', marginBottom: '12px' },
    btnPrimary: { background: amber, color: '#fff', border: 'none', padding: '12px 24px', fontSize: '13px', letterSpacing: '0.04em', cursor: 'pointer', fontFamily: 'Georgia, serif' },
    btnSecondary: { background: 'transparent', color: text, border: `1px solid ${border}`, padding: '12px 24px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif' },
    articleItem: { padding: '16px 0', borderBottom: `1px solid ${border}` },
    articleTitle: { fontSize: '15px', fontWeight: 'normal', margin: '0 0 4px' },
    articleDeck: { fontSize: '13px', color: muted, margin: 0 },
    issueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${border}` },
    msg: (type) => ({ padding: '12px 16px', marginBottom: '16px', fontSize: '14px', background: type === 'success' ? '#f0f7f0' : '#fdf0f0', color: type === 'success' ? '#2d6a2d' : '#c0392b', border: `1px solid ${type === 'success' ? '#c3e0c3' : '#f5c6cb'}` }),
  }

  if (loading) {
    return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: muted }}>Loading…</p></div>
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: muted }}>Small Batch Atlas</p>
          <h1 style={s.h1}>Newsletter</h1>
        </div>
        <div style={s.stat}>
          <span style={s.statNum}>{subscribers}</span>
          <span style={s.statLabel}>Active subscribers</span>
        </div>
      </div>

      {message && <div style={s.msg(message.type)}>{message.text}</div>}

      {/* Draft issue */}
      <div style={s.card}>
        <p style={s.cardTitle}>Current draft</p>

        {!draft ? (
          <div>
            <p style={{ fontSize: '15px', color: muted, margin: '0 0 20px', lineHeight: 1.6 }}>
              No draft for this month yet. Generate one automatically from the latest published articles.
            </p>
            <button onClick={generateDraft} disabled={generating} style={s.btnPrimary}>
              {generating ? 'Generating…' : 'Generate draft'}
            </button>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: '12px', color: muted, display: 'block', marginBottom: '4px' }}>Subject line</label>
            <input
              style={s.input}
              value={draft.subject}
              onChange={e => updateDraftField('subject', e.target.value)}
            />
            <label style={{ fontSize: '12px', color: muted, display: 'block', marginBottom: '4px' }}>Intro paragraph</label>
            <textarea
              style={s.textarea}
              value={draft.intro || ''}
              onChange={e => updateDraftField('intro', e.target.value)}
            />

            {/* Articles in this issue */}
            {articles.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: muted, margin: '0 0 12px' }}>Articles included ({articles.length})</p>
                {articles.map(a => (
                  <div key={a.id} style={s.articleItem}>
                    <p style={s.articleTitle}>{a.title}{a.is_partner_content && <span style={{ fontSize: '11px', color: muted, marginLeft: '8px' }}>[Partner]</span>}</p>
                    {a.deck && <p style={s.articleDeck}>{a.deck}</p>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button onClick={sendIssue} disabled={sending} style={s.btnPrimary}>
                {sending ? 'Sending…' : `Send to ${subscribers} subscribers`}
              </button>
              <button onClick={generateDraft} disabled={generating} style={s.btnSecondary}>
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Issue history */}
      {issues.length > 0 && (
        <div style={s.card}>
          <p style={s.cardTitle}>Sent issues</p>
          {issues.map(issue => (
            <div key={issue.id} style={s.issueRow}>
              <span style={{ fontSize: '15px' }}>{issue.subject}</span>
              <span style={{ fontSize: '13px', color: muted }}>
                {new Date(issue.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
