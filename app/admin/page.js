'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

// ─── Markdown ↔ HTML ──────────────────────────────────────────────────────────
function mdToHtml(md) {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure><img src="$2" alt="$1" /></figure>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^\d+\. (.+)$/gm, '<li data-t="ol">$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li data-t="ol">[\s\S]*?<\/li>\n?)+/g, m => `<ol>${m.replace(/ data-t="ol"/g, '')}</ol>`)
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
  html = html.split('\n').map(line => {
    const t = line.trim()
    if (!t) return ''
    if (/^<(h[123]|ul|ol|li|blockquote|hr|figure|p)/.test(t)) return t
    return `<p>${t}</p>`
  }).filter(Boolean).join('\n')
  return html || ''
}

function htmlToMd(el) {
  function walk(node) {
    if (node.nodeType === 3) return node.textContent
    if (node.nodeType !== 1) return ''
    const tag = node.tagName.toLowerCase()
    const inner = Array.from(node.childNodes).map(walk).join('')
    if (tag === 'h1') return `# ${inner}\n\n`
    if (tag === 'h2') return `## ${inner}\n\n`
    if (tag === 'h3') return `### ${inner}\n\n`
    if (tag === 'strong' || tag === 'b') return `**${inner}**`
    if (tag === 'em' || tag === 'i') return `*${inner}*`
    if (tag === 'code') return `\`${inner}\``
    if (tag === 'a') return `[${inner}](${node.getAttribute('href') || node.href})`
    if (tag === 'blockquote') return `> ${inner.replace(/\n+$/, '')}\n\n`
    if (tag === 'hr') return `---\n\n`
    if (tag === 'figure') {
      const img = node.querySelector('img')
      const cap = node.querySelector('figcaption')
      return img ? `![${cap?.textContent || img.alt || ''}](${img.src})\n\n` : inner
    }
    if (tag === 'img') return `![${node.alt || ''}](${node.src})\n\n`
    if (tag === 'ol') return inner + '\n'
    if (tag === 'ul') return inner + '\n'
    if (tag === 'li') {
      const isOl = node.parentElement?.tagName.toLowerCase() === 'ol'
      return isOl ? `1. ${inner}\n` : `- ${inner}\n`
    }
    if (tag === 'br') return '\n'
    if (tag === 'p') return inner ? `${inner}\n\n` : ''
    if (tag === 'div') return inner ? `${inner}\n` : ''
    return inner
  }
  return Array.from(el.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim()
}

function getWordCount(el) {
  if (!el) return 0
  return (el.innerText || '').trim().split(/\s+/).filter(w => w.length > 0).length
}

// ─── Tag Input ────────────────────────────────────────────────────────────────
const SUGGESTED_TAGS = [
  'Victoria', 'New South Wales', 'Queensland', 'South Australia', 'Western Australia',
  'Tasmania', 'Northern Territory', 'ACT',
  'Ceramics', 'Textiles', 'Woodwork', 'Metalwork', 'Glass', 'Leather',
  'Maker', 'Studio', 'Maker', 'Studio',
  'Region Guide', 'News', 'Events', 'Interview', 'History',
]

function TagInput({ tags = [], onChange, suggestions = SUGGESTED_TAGS, freeform = true }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  const filtered = suggestions.filter(s =>
    !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  ).slice(0, 8)

  function addTag(tag) {
    const t = tag.trim()
    if (!t || tags.includes(t)) return
    onChange([...tags, t])
    setInput('')
    setShowSuggestions(false)
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag))
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && freeform) {
      e.preventDefault()
      if (input.trim()) addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
    if (e.key === 'Escape') setShowSuggestions(false)
  }

  const lbl = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7, display: 'block', fontFamily: 'var(--font-sans)' }

  return (
    <div>
      <label style={lbl}>Tags</label>
      <div style={{ position: 'relative' }}>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)', cursor: 'text', minHeight: 40 }}
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'rgba(200,148,58,0.12)', border: '1px solid rgba(200,148,58,0.3)', borderRadius: 3, fontSize: 11, fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>
              {tag}
              <button onClick={e => { e.stopPropagation(); removeTag(tag) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, lineHeight: 1, fontSize: 13, opacity: 0.7 }}>×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length ? '' : 'Type a tag…'}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text)', minWidth: 80, flex: 1 }}
          />
        </div>
        {showSuggestions && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, zIndex: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginTop: 2 }}>
            {filtered.map(s => (
              <div key={s} onMouseDown={() => addTag(s)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text-2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
      {freeform && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, fontFamily: 'var(--font-sans)' }}>Press Enter or comma to add. Click × to remove.</div>}
    </div>
  )
}

// ─── WYSIWYG Editor ───────────────────────────────────────────────────────────
function WYSIWYGEditor({ value, onUploadImage, uploading }) {
  const editorRef = useRef(null)
  const bubbleRef = useRef(null)
  const slashMenuRef = useRef(null)
  const linkPopRef = useRef(null)
  const [bubble, setBubble] = useState(null)
  const [slashMenu, setSlashMenu] = useState(null)
  const [linkPop, setLinkPop] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [activeFormats, setActiveFormats] = useState({})
  const savedRange = useRef(null)
  const initialised = useRef(false)
  const slashMenuIdx = useRef(0)
  const [slashSelected, setSlashSelected] = useState(0)

  useEffect(() => {
    if (editorRef.current && !initialised.current) {
      initialised.current = true
      const html = value ? mdToHtml(value) : ''
      editorRef.current.innerHTML = html || ''
      setWordCount(getWordCount(editorRef.current))
    }
  }, [])

  function saveRange() {
    const sel = window.getSelection()
    if (sel?.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange()
  }

  function restoreRange() {
    if (!savedRange.current) return
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedRange.current)
  }

  const updateFormats = useCallback(() => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      })
    } catch {}
  }, [])

  const updateBubble = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) { setBubble(null); return }
    const range = sel.getRangeAt(0)
    if (!editorRef.current?.contains(range.commonAncestorContainer)) { setBubble(null); return }
    const rect = range.getBoundingClientRect()
    const edRect = editorRef.current.getBoundingClientRect()
    setBubble({
      x: rect.left - edRect.left + rect.width / 2,
      y: rect.top - edRect.top - 54,
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
    })
  }, [])

  const checkSlash = useCallback(() => {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== 3) { setSlashMenu(null); return }
    const text = node.textContent.slice(0, range.startOffset)
    const slashIdx = text.lastIndexOf('/')
    if (slashIdx === -1) { setSlashMenu(null); return }
    if (slashIdx > 0 && !/\s/.test(text[slashIdx - 1])) { setSlashMenu(null); return }
    const query = text.slice(slashIdx + 1).toLowerCase()
    const rect = range.getBoundingClientRect()
    const edRect = editorRef.current.getBoundingClientRect()
    setSlashSelected(0)
    setSlashMenu({ x: rect.left - edRect.left, y: rect.bottom - edRect.top + 6, query, slashIdx, node })
  }, [])

  function handleInput() { setWordCount(getWordCount(editorRef.current)) }

  function handleKeyDown(e) {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); updateFormats(); return }
    if (mod && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); updateFormats(); return }
    if (mod && e.key === 'k') { e.preventDefault(); openLinkPop(); return }
    if (slashMenu) {
      const cmds = getSlashCmds(slashMenu.query)
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashSelected(s => Math.min(s + 1, cmds.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashSelected(s => Math.max(s - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (cmds[slashSelected]) execSlashCmd(cmds[slashSelected].cmd); return }
      if (e.key === 'Escape') { setSlashMenu(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection()
      if (!sel?.rangeCount) return
      const block = sel.getRangeAt(0).startContainer
      const el = block.nodeType === 3 ? block.parentElement : block
      const heading = el.closest('h1,h2,h3')
      if (heading) {
        e.preventDefault()
        const p = document.createElement('p'); p.innerHTML = '<br>'
        heading.after(p)
        const r = document.createRange(); r.setStart(p, 0); r.collapse(true)
        sel.removeAllRanges(); sel.addRange(r)
        setBubble(null); setSlashMenu(null); return
      }
    }
    if (e.key === 'Backspace') {
      const sel = window.getSelection()
      if (!sel?.rangeCount || !sel.isCollapsed) return
      const range = sel.getRangeAt(0)
      const block = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer
      const special = block.closest('h1,h2,h3,blockquote')
      if (special && (special.textContent === '' || special.innerHTML === '<br>')) {
        e.preventDefault()
        const p = document.createElement('p'); p.innerHTML = '<br>'
        special.replaceWith(p)
        const r = document.createRange(); r.setStart(p, 0); r.collapse(true)
        sel.removeAllRanges(); sel.addRange(r)
        return
      }
    }
    if (e.key === 'Escape') { setSlashMenu(null); setLinkPop(null) }
    if (e.key !== '/' && e.key !== 'Backspace') setSlashMenu(null)
  }

  function handleKeyUp(e) {
    updateBubble(); updateFormats()
    if (e.key === '/' || e.key === 'Backspace' || (slashMenu && !['ArrowUp','ArrowDown','Enter','Tab','Escape'].includes(e.key))) checkSlash()
  }

  function openLinkPop() {
    const sel = window.getSelection()
    if (!sel?.rangeCount || sel.isCollapsed) return
    saveRange()
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    const edRect = editorRef.current.getBoundingClientRect()
    const existing = sel.anchorNode?.parentElement?.closest('a')
    setLinkUrl(existing?.getAttribute('href') || '')
    setLinkPop({ x: rect.left - edRect.left + rect.width / 2, y: rect.top - edRect.top - 54 })
    setBubble(null)
  }

  function applyLink(e) {
    e?.preventDefault(); restoreRange(); editorRef.current?.focus()
    if (linkUrl.trim()) document.execCommand('createLink', false, linkUrl.trim())
    else document.execCommand('unlink')
    setLinkPop(null); setLinkUrl('')
  }

  function removeLink() {
    restoreRange(); editorRef.current?.focus()
    document.execCommand('unlink')
    setLinkPop(null); setLinkUrl('')
  }

  function getSlashCmds(query) {
    const ALL = [
      { cmd: 'h1', label: 'Heading 1', desc: 'Large section heading', icon: 'H₁', keys: 'h1' },
      { cmd: 'h2', label: 'Heading 2', desc: 'Medium section heading', icon: 'H₂', keys: 'h2' },
      { cmd: 'h3', label: 'Heading 3', desc: 'Small section heading', icon: 'H₃', keys: 'h3' },
      { cmd: 'ul', label: 'Bullet List', desc: 'Unordered list', icon: '•', keys: 'ul list bullet' },
      { cmd: 'ol', label: 'Numbered List', desc: 'Ordered list', icon: '①', keys: 'ol number ordered' },
      { cmd: 'blockquote', label: 'Quote', desc: 'Highlighted pullquote', icon: '❝', keys: 'quote blockquote' },
      { cmd: 'hr', label: 'Divider', desc: 'Horizontal rule', icon: '—', keys: 'hr divider line' },
      { cmd: 'image', label: 'Image', desc: 'Upload from computer', icon: '🖼', keys: 'image photo img' },
    ]
    if (!query) return ALL
    return ALL.filter(c => c.label.toLowerCase().includes(query) || c.cmd.includes(query) || c.keys.includes(query))
  }

  function execSlashCmd(cmd) {
    if (!slashMenu) return
    const { node, slashIdx } = slashMenu
    node.textContent = node.textContent.slice(0, slashIdx)
    const sel = window.getSelection()
    const r = document.createRange()
    r.setStart(node, node.textContent.length); r.collapse(true)
    sel.removeAllRanges(); sel.addRange(r)
    setSlashMenu(null)
    const anchor = node.nodeType === 3 ? node.parentElement : node
    const line = anchor.closest('p,h1,h2,h3,div,blockquote') || anchor
    if (['h1','h2','h3'].includes(cmd)) {
      const el = document.createElement(cmd); el.innerHTML = '<br>'
      line.replaceWith(el)
      const r2 = document.createRange(); r2.setStart(el, 0); r2.collapse(true)
      sel.removeAllRanges(); sel.addRange(r2)
    } else if (cmd === 'ul') { document.execCommand('insertUnorderedList')
    } else if (cmd === 'ol') { document.execCommand('insertOrderedList')
    } else if (cmd === 'blockquote') {
      const bq = document.createElement('blockquote')
      const p2 = document.createElement('p'); p2.innerHTML = '<br>'
      bq.appendChild(p2); line.replaceWith(bq)
      const r2 = document.createRange(); r2.setStart(p2, 0); r2.collapse(true)
      sel.removeAllRanges(); sel.addRange(r2)
    } else if (cmd === 'hr') {
      const hr = document.createElement('hr')
      const p2 = document.createElement('p'); p2.innerHTML = '<br>'
      line.replaceWith(hr); hr.after(p2)
      const r2 = document.createRange(); r2.setStart(p2, 0); r2.collapse(true)
      sel.removeAllRanges(); sel.addRange(r2)
    } else if (cmd === 'image') { document.getElementById('wysiwyg-img-input')?.click() }
    editorRef.current?.focus()
  }

  function insertHeading(level) {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const block = sel.getRangeAt(0).startContainer
    const el = (block.nodeType === 3 ? block.parentElement : block).closest('p,h1,h2,h3,div,blockquote') || block
    const tag = `h${level}`
    const newEl = document.createElement(tag)
    newEl.innerHTML = el.innerHTML || '<br>'
    el.replaceWith(newEl)
    const r = document.createRange(); r.selectNodeContents(newEl); r.collapse(false)
    sel.removeAllRanges(); sel.addRange(r)
    setBubble(null)
  }

  function execCmd(cmd, value) { editorRef.current?.focus(); document.execCommand(cmd, false, value); updateFormats() }

  async function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) { const url = await onUploadImage(file); if (url) insertImage(url) }
  }

  function insertImage(url) {
    editorRef.current?.focus()
    const figure = document.createElement('figure')
    const img = document.createElement('img'); img.src = url; img.alt = ''
    figure.appendChild(img)
    const p = document.createElement('p'); p.innerHTML = '<br>'
    const sel = window.getSelection()
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0)
      const anchor = (range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer).closest('p,h1,h2,h3,div,blockquote,figure') || range.startContainer
      anchor.after(p); anchor.after(figure)
    } else { editorRef.current.appendChild(figure); editorRef.current.appendChild(p) }
    const r = document.createRange(); r.setStart(p, 0); r.collapse(true)
    sel.removeAllRanges(); sel.addRange(r)
    setWordCount(getWordCount(editorRef.current))
  }

  useEffect(() => {
    function onDown(e) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) setBubble(null)
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target)) setSlashMenu(null)
      if (linkPopRef.current && !linkPopRef.current.contains(e.target)) setLinkPop(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const TB = ({ title, active, onClick, children, extraStyle = {} }) => (
    <button title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ padding: '5px 9px', border: 'none', borderRadius: 3, cursor: 'pointer', background: active ? 'rgba(200,148,58,0.15)' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-2)', fontSize: 13, fontWeight: 600, lineHeight: 1, transition: 'all 0.1s', fontFamily: 'var(--font-sans)', ...extraStyle }}>
      {children}
    </button>
  )
  const BB = ({ title, active, onClick, children }) => (
    <button title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ padding: '5px 9px', border: 'none', borderRadius: 4, cursor: 'pointer', background: active ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
      {children}
    </button>
  )
  const Sep = () => <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', alignSelf: 'center', flexShrink: 0 }} />
  const visibleSlashCmds = slashMenu ? getSlashCmds(slashMenu.query) : []

  return (
    <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)', overflow: 'visible' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, padding: '6px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10, borderRadius: '3px 3px 0 0' }}>
        <TB title="Heading 1 · type /h1" onClick={() => insertHeading(1)} extraStyle={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '-0.02em' }}>H1</TB>
        <TB title="Heading 2 · type /h2" onClick={() => insertHeading(2)} extraStyle={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '-0.02em' }}>H2</TB>
        <TB title="Heading 3 · type /h3" onClick={() => insertHeading(3)} extraStyle={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '-0.02em' }}>H3</TB>
        <Sep />
        <TB title="Bold · ⌘B" active={activeFormats.bold} onClick={() => execCmd('bold')}><span style={{ fontWeight: 800 }}>B</span></TB>
        <TB title="Italic · ⌘I" active={activeFormats.italic} onClick={() => execCmd('italic')}><em style={{ fontStyle: 'italic' }}>I</em></TB>
        <TB title="Link · ⌘K" onClick={openLinkPop}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6.5 9.5a4 4 0 005.66 0l2-2a4 4 0 00-5.65-5.66L7.35 3"/><path d="M9.5 6.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.65 5.66L8.65 13"/></svg>
        </TB>
        <Sep />
        <TB title="Bullet list · type /ul" active={activeFormats.ul} onClick={() => execCmd('insertUnorderedList')}>
          <svg width="14" height="13" viewBox="0 0 14 13" fill="none"><circle cx="2" cy="2.5" r="1.4" fill="currentColor"/><line x1="5.5" y1="2.5" x2="13" y2="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="2" cy="6.5" r="1.4" fill="currentColor"/><line x1="5.5" y1="6.5" x2="13" y2="6.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="2" cy="10.5" r="1.4" fill="currentColor"/><line x1="5.5" y1="10.5" x2="13" y2="10.5" stroke="currentColor" strokeWidth="1.6"/></svg>
        </TB>
        <TB title="Numbered list · type /ol" active={activeFormats.ol} onClick={() => execCmd('insertOrderedList')}>
          <svg width="14" height="13" viewBox="0 0 14 13" fill="currentColor"><text x="0" y="4.5" fontSize="5.5" fontFamily="serif">1.</text><line x1="5.5" y1="2.5" x2="13" y2="2.5" stroke="currentColor" strokeWidth="1.6"/><text x="0" y="8.5" fontSize="5.5" fontFamily="serif">2.</text><line x1="5.5" y1="6.5" x2="13" y2="6.5" stroke="currentColor" strokeWidth="1.6"/><text x="0" y="12.5" fontSize="5.5" fontFamily="serif">3.</text><line x1="5.5" y1="10.5" x2="13" y2="10.5" stroke="currentColor" strokeWidth="1.6"/></svg>
        </TB>
        <Sep />
        <TB title="Blockquote · type /quote" onClick={() => execCmd('formatBlock', 'blockquote')}>
          <svg width="13" height="11" viewBox="0 0 14 12" fill="currentColor"><path d="M0 12V7.5C0 4.26 1.72 1.88 5.16.3L6 1.7C4.04 2.6 2.96 3.82 2.78 5.5H5V12H0zm8 0V7.5c0-3.24 1.72-5.62 5.16-7.2L14 1.7c-1.96.9-3.04 2.12-3.22 3.8H13V12H8z"/></svg>
        </TB>
        <TB title="Divider · type /hr" onClick={() => {
          editorRef.current?.focus()
          const sel = window.getSelection(); if (!sel?.rangeCount) return
          const range = sel.getRangeAt(0)
          const block = (range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer).closest('p,h1,h2,h3,div,blockquote') || range.startContainer
          const hr = document.createElement('hr'); const p = document.createElement('p'); p.innerHTML = '<br>'
          block.after(p); block.after(hr)
          const r = document.createRange(); r.setStart(p, 0); r.collapse(true)
          sel.removeAllRanges(); sel.addRange(r)
        }}>
          <svg width="14" height="10" viewBox="0 0 14 10"><line x1="0" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.6"/></svg>
        </TB>
        <Sep />
        <label title="Insert image · type /image · or drag & drop" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', cursor: uploading ? 'wait' : 'pointer', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', borderRadius: 3 }}>
          <svg width="14" height="13" viewBox="0 0 16 15" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="2" width="14" height="11" rx="1.5"/><circle cx="5.5" cy="5.5" r="1.3"/><path d="M1 11l3.5-3.5 3 3 2.5-2.5 4 4"/></svg>
          {uploading ? 'Uploading…' : 'Image'}
          <input id="wysiwyg-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
            if (e.target.files[0]) { const url = await onUploadImage(e.target.files[0]); if (url) insertImage(url) }
            e.target.value = ''
          }} />
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, fontSize: 10, lineHeight: 1.7 }}>/</kbd> for blocks
          </span>
        </div>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder="Start writing, or type / to insert a block..."
        onInput={handleInput} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onMouseUp={updateBubble}
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        style={{ minHeight: 480, padding: '28px 32px', outline: 'none', fontSize: 17, fontFamily: 'var(--font-serif)', color: 'var(--text)', lineHeight: 1.85 }}
      />
      {bubble && bubble.y > -200 && (
        <div ref={bubbleRef} style={{ position: 'absolute', left: bubble.x, top: bubble.y, transform: 'translateX(-50%)', background: '#1c1c1c', borderRadius: 8, padding: '3px 5px', display: 'flex', gap: 1, alignItems: 'center', boxShadow: '0 6px 28px rgba(0,0,0,0.4)', zIndex: 50, whiteSpace: 'nowrap', animation: 'bubbleIn 0.1s ease-out' }}>
          <BB title="Bold ⌘B" active={bubble.bold} onClick={() => { execCmd('bold'); updateBubble() }}><span style={{ fontWeight: 800 }}>B</span></BB>
          <BB title="Italic ⌘I" active={bubble.italic} onClick={() => { execCmd('italic'); updateBubble() }}><em style={{ fontStyle: 'italic' }}>I</em></BB>
          <BB title="Strikethrough" active={false} onClick={() => { execCmd('strikeThrough'); updateBubble() }}><span style={{ textDecoration: 'line-through', fontSize: 12 }}>S</span></BB>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 3px' }} />
          <BB title="Link ⌘K" active={false} onClick={openLinkPop}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 9.5a4 4 0 005.66 0l2-2a4 4 0 00-5.65-5.66L7.35 3"/><path d="M9.5 6.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.65 5.66L8.65 13"/></svg>
          </BB>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 3px' }} />
          <BB title="Heading 1" onClick={() => { insertHeading(1); setBubble(null) }}>H1</BB>
          <BB title="Heading 2" onClick={() => { insertHeading(2); setBubble(null) }}>H2</BB>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 3px' }} />
          <BB title="Blockquote" onClick={() => { execCmd('formatBlock', 'blockquote'); setBubble(null) }}>
            <svg width="11" height="10" viewBox="0 0 14 12" fill="white"><path d="M0 12V7.5C0 4.26 1.72 1.88 5.16.3L6 1.7C4.04 2.6 2.96 3.82 2.78 5.5H5V12H0zm8 0V7.5c0-3.24 1.72-5.62 5.16-7.2L14 1.7c-1.96.9-3.04 2.12-3.22 3.8H13V12H8z"/></svg>
          </BB>
          <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1c1c1c' }} />
        </div>
      )}
      {linkPop && (
        <div ref={linkPopRef} style={{ position: 'absolute', left: linkPop.x, top: linkPop.y, transform: 'translateX(-50%)', background: '#1c1c1c', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 6px 28px rgba(0,0,0,0.4)', zIndex: 51, minWidth: 320, animation: 'bubbleIn 0.1s ease-out' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#666" strokeWidth="2"><path d="M6.5 9.5a4 4 0 005.66 0l2-2a4 4 0 00-5.65-5.66L7.35 3"/><path d="M9.5 6.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.65 5.66L8.65 13"/></svg>
          <input autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') applyLink(e); if (e.key === 'Escape') setLinkPop(null) }} placeholder="Paste or type a URL..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: 'var(--font-sans)', minWidth: 0 }} />
          <button onMouseDown={applyLink} style={{ padding: '4px 12px', background: '#c8943a', border: 'none', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Apply</button>
          {linkUrl && <button onMouseDown={e => { e.preventDefault(); removeLink() }} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4, color: '#aaa', fontSize: 11, cursor: 'pointer' }}>Remove</button>}
        </div>
      )}
      {slashMenu && visibleSlashCmds.length > 0 && (
        <div ref={slashMenuRef} style={{ position: 'absolute', left: Math.max(4, Math.min(slashMenu.x, 360)), top: slashMenu.y, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.14)', zIndex: 52, minWidth: 270, overflow: 'hidden', animation: 'fadeSlash 0.1s ease-out' }}>
          <div style={{ padding: '7px 14px 5px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', borderBottom: '1px solid var(--border)' }}>Insert block</div>
          {visibleSlashCmds.map((c, i) => (
            <div key={c.cmd} onMouseDown={e => { e.preventDefault(); execSlashCmd(c.cmd) }} onMouseEnter={() => setSlashSelected(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 14px', cursor: 'pointer', background: i === slashSelected ? 'var(--bg-2)' : 'transparent', transition: 'background 0.08s' }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text-2)', background: i === slashSelected ? 'var(--bg)' : 'var(--bg-2)', flexShrink: 0 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{c.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{c.desc}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace', opacity: 0.5 }}>/{c.keys.split(' ')[0]}</div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes bubbleIn { from { opacity:0; transform:translateX(-50%) translateY(4px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        @keyframes fadeSlash { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
        [contenteditable]:empty:before { content:attr(data-placeholder); color:var(--text-3); font-style:italic; pointer-events:none }
        [contenteditable] p:only-child:empty:before { content:attr(data-placeholder); color:var(--text-3); font-style:italic; pointer-events:none; display:block }
        [contenteditable] h1 { font-family:var(--font-serif); font-size:2.1em; font-weight:400; margin:0.15em 0 0.4em; line-height:1.15; letter-spacing:-0.01em }
        [contenteditable] h2 { font-family:var(--font-serif); font-size:1.5em; font-weight:400; margin:0.8em 0 0.3em; line-height:1.25 }
        [contenteditable] h3 { font-family:var(--font-sans); font-size:1.0em; font-weight:700; margin:0.9em 0 0.3em; line-height:1.4; letter-spacing:0.05em; text-transform:uppercase }
        [contenteditable] p { margin:0 0 0.65em }
        [contenteditable] strong, [contenteditable] b { font-weight:700 }
        [contenteditable] em, [contenteditable] i { font-style:italic }
        [contenteditable] s { text-decoration:line-through; opacity:0.6 }
        [contenteditable] code { font-family:'Menlo','Monaco',monospace; font-size:0.83em; background:var(--bg-2); border:1px solid var(--border); padding:2px 5px; border-radius:3px }
        [contenteditable] a { color:var(--primary); text-decoration:underline; text-underline-offset:2px }
        [contenteditable] ul { padding-left:1.5em; margin:0.4em 0 0.7em }
        [contenteditable] ol { padding-left:1.5em; margin:0.4em 0 0.7em }
        [contenteditable] li { margin-bottom:0.3em }
        [contenteditable] blockquote { border-left:3px solid var(--primary); margin:1.2em 0; padding:3px 0 3px 18px; color:var(--text-2); font-style:italic; font-size:1.05em }
        [contenteditable] blockquote p { margin:0 }
        [contenteditable] hr { border:none; border-top:1px solid var(--border); margin:2em 0 }
        [contenteditable] figure { margin:1.5em 0 }
        [contenteditable] figure img { max-width:100%; height:auto; display:block; border-radius:3px }
        [contenteditable] figcaption { margin-top:7px; font-size:13px; color:var(--text-3); font-family:var(--font-sans); font-style:italic; text-align:center }
        [contenteditable] img { max-width:100%; height:auto; display:block; border-radius:3px; margin:1em 0 }
        [contenteditable]:focus { caret-color:var(--primary) }
        [contenteditable] ::selection { background:rgba(200,148,58,0.2) }
      `}</style>
    </div>
  )
}

// ─── Article Editor ───────────────────────────────────────────────────────────
function ArticleEditor({ article, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: article?.title || '', slug: article?.slug || '', deck: article?.deck || '',
    hero_image_url: article?.hero_image_url || '', category: article?.category || '',
    author: article?.author || '', status: article?.status || 'draft',
    reading_time: article?.reading_time || '', meta_title: article?.meta_title || '',
    meta_description: article?.meta_description || '', tags: article?.tags || [],
  })
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [heroUploading, setHeroUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const editorWrapRef = useRef(null)

  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

  async function uploadImage(file) {
    if (!file?.type.startsWith('image/')) return null
    setUploading(true)
    const supabase = getSupabase()
    const ext = file.name.split('.').pop()
    const fn = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('article-images').upload(fn, file, { contentType: file.type })
    setUploading(false)
    if (error) { setError('Upload failed: ' + error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(fn)
    return publicUrl
  }

  async function uploadHero(file) {
    setHeroUploading(true)
    const url = await uploadImage(file)
    setHeroUploading(false)
    if (url) setForm(f => ({ ...f, hero_image_url: url }))
  }

  async function handleSave(status) {
    setSaving(status); setError(null)
    const editorEl = editorWrapRef.current?.querySelector('[contenteditable]')
    const body = editorEl ? htmlToMd(editorEl) : ''
    const supabase = getSupabase()
    const payload = {
      ...form, body, status: status || form.status,
      reading_time: form.reading_time ? parseInt(form.reading_time) : null,
      published_at: (status === 'published' || form.status === 'published') ? (article?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    }
    const result = article?.id
      ? await supabase.from('articles').update(payload).eq('id', article.id)
      : await supabase.from('articles').insert({ ...payload, created_at: new Date().toISOString() })
    setSaving(null)
    if (result.error) { setError(result.error.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
    if (status === 'published') onSave()
  }

  useEffect(() => {
    function onKey(e) { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave('draft') } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [form])

  const input = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--bg)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7, display: 'block', fontFamily: 'var(--font-sans)' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-sans)', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 2L4 7l5 5"/></svg> Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--text)', margin: 0 }}>{article ? 'Edit Article' : 'New Article'}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 12, color: '#4a7c59', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Saved</span>}
          {(uploading || heroUploading) && <span style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>Uploading...</span>}
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>⌘S to save</span>
          <button onClick={() => handleSave('draft')} disabled={!!saving} style={{ padding: '9px 20px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)', color: 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', opacity: saving ? 0.6 : 1 }}>
            {saving === 'draft' ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => handleSave('published')} disabled={!!saving} style={{ padding: '9px 20px', border: 'none', borderRadius: 3, background: '#4a7c59', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', opacity: saving ? 0.6 : 1 }}>
            {saving === 'published' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', background: 'rgba(139,74,74,0.1)', border: '1px solid rgba(139,74,74,0.4)', borderRadius: 3, color: '#c05a5a', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 28, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={lbl}>Title</label>
            <input style={{ ...input, fontSize: 24, fontFamily: 'var(--font-serif)', fontWeight: 400, padding: '12px 14px' }} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: article ? f.slug : slugify(e.target.value) }))} placeholder="Article title..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Slug</label>
              <input style={input} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="url-slug" />
            </div>
            <div>
              <label style={lbl}>Category</label>
              <input style={input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Region Guide, News..." />
            </div>
          </div>
          <div>
            <label style={lbl}>Deck / Subtitle</label>
            <input style={input} value={form.deck} onChange={e => setForm(f => ({ ...f, deck: e.target.value }))} placeholder="Short description shown in listings and social previews..." />
          </div>
          <div>
            <label style={lbl}>Body</label>
            <div ref={editorWrapRef}>
              <WYSIWYGEditor value={article?.body} onUploadImage={uploadImage} uploading={uploading} />
            </div>
          </div>
          <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>SEO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Meta Title</label>
                <input style={input} value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} placeholder="Defaults to article title" />
              </div>
              <div>
                <label style={lbl}>Meta Description</label>
                <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={form.meta_description} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} placeholder="~155 characters recommended..." />
                {form.meta_description && <div style={{ fontSize: 11, color: form.meta_description.length > 155 ? '#c05a5a' : 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>{form.meta_description.length}/155</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <label style={lbl}>Status</label>
            <select style={{ ...input, cursor: 'pointer' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <label style={lbl}>Hero Image</label>
            {form.hero_image_url ? (
              <div>
                <div style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: 3, marginBottom: 10, background: 'var(--bg)' }}>
                  <img src={form.hero_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <label style={{ flex: 1, padding: '6px 0', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)', color: 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                    Replace <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadHero(e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <button onClick={() => setForm(f => ({ ...f, hero_image_url: '' }))} style={{ flex: 1, padding: '6px 0', border: '1px solid rgba(139,74,74,0.3)', borderRadius: 3, background: 'rgba(139,74,74,0.08)', color: '#8b4a4a', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>Remove</button>
                </div>
                <input style={{ ...input, fontSize: 12 }} value={form.hero_image_url} onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))} placeholder="https://..." />
              </div>
            ) : (
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 12px', border: '2px dashed var(--border)', borderRadius: 3, cursor: heroUploading ? 'wait' : 'pointer', color: 'var(--text-3)', textAlign: 'center', transition: 'border-color 0.15s, background 0.15s', marginBottom: 10 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(200,148,58,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
                  {heroUploading ? <span style={{ fontSize: 12, fontFamily: 'var(--font-sans)' }}>Uploading...</span> : <>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-sans)' }}>Click to upload</span>
                  </>}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadHero(e.target.files[0]); e.target.value = '' }} />
                </label>
                <input style={{ ...input, fontSize: 12 }} value={form.hero_image_url} onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))} placeholder="Or paste URL..." />
              </div>
            )}
          </div>

          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Author</label>
                <input style={input} value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" />
              </div>
              <div>
                <label style={lbl}>Reading Time (mins)</label>
                <input style={input} type="number" min="1" max="120" value={form.reading_time} onChange={e => setForm(f => ({ ...f, reading_time: e.target.value }))} placeholder="5" />
              </div>
            </div>
          </div>

          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <TagInput tags={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Articles List ────────────────────────────────────────────────────────────
function ArticlesTab() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  useEffect(() => { if (!editing) fetchArticles() }, [filter, editing])

  async function fetchArticles() {
    setLoading(true)
    const supabase = getSupabase()
    let q = supabase.from('articles').select('id,title,slug,body,status,category,author,published_at,reading_time,hero_image_url,deck,meta_title,meta_description,tags,created_at').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setArticles(data || []); setLoading(false)
  }

  async function toggleStatus(article) {
    const ns = article.status === 'published' ? 'draft' : 'published'
    await getSupabase().from('articles').update({ status: ns, published_at: ns === 'published' ? (article.published_at || new Date().toISOString()) : null }).eq('id', article.id)
    fetchArticles()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this article? Cannot be undone.')) return
    await getSupabase().from('articles').delete().eq('id', id)
    fetchArticles()
  }

  if (editing) return <ArticleEditor article={editing === 'new' ? null : editing} onSave={() => setEditing(null)} onCancel={() => setEditing(null)} />

  const counts = { all: articles.length, published: articles.filter(a => a.status === 'published').length, draft: articles.filter(a => a.status === 'draft').length }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Articles</h1>
        <button onClick={() => setEditing('new')} style={{ padding: '10px 22px', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
          New Article
        </button>
      </div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {['all','published','draft'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: filter === f ? 'var(--text)' : 'var(--text-3)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -1, fontFamily: 'var(--font-sans)' }}>
            {f} <span style={{ opacity: 0.5 }}>({counts[f] ?? 0})</span>
          </button>
        ))}
      </div>
      {loading ? <div style={{ color: 'var(--text-3)', fontSize: 14, fontFamily: 'var(--font-sans)', padding: '40px 0' }}>Loading...</div>
      : articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>No articles yet</div>
          <button onClick={() => setEditing('new')} style={{ padding: '11px 28px', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>+ New Article</button>
        </div>
      ) : articles.map(article => (
        <div key={article.id} style={{ padding: '13px 18px', marginBottom: 6, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${article.status === 'published' ? '#4a7c59' : 'var(--border)'}`, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {article.hero_image_url && <div style={{ width: 54, height: 38, borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)' }}><img src={article.hero_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-sans)' }}>{article.title || 'Untitled'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {article.category && <span>{article.category}</span>}
              {article.author && <span>by {article.author}</span>}
              {article.reading_time && <span>{article.reading_time} min</span>}
              {(article.tags || []).slice(0, 3).map(t => <span key={t} style={{ color: 'var(--primary)', opacity: 0.7 }}>{t}</span>)}
            </div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 12, background: article.status === 'published' ? 'rgba(74,124,89,0.12)' : 'var(--bg-2)', color: article.status === 'published' ? '#4a7c59' : 'var(--text-3)', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{article.status}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => toggleStatus(article)} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>{article.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            <button onClick={() => setEditing(article)} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-sans)' }}>Edit</button>
            <button onClick={() => handleDelete(article.id)} style={{ padding: '6px 12px', border: '1px solid rgba(139,74,74,0.3)', borderRadius: 3, background: 'rgba(139,74,74,0.06)', color: '#8b4a4a', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-sans)' }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Partners Tab ─────────────────────────────────────────────────────────────
const VERTICALS = ['ceramics', 'textiles', 'woodwork', 'metalwork', 'glass', 'leather', 'printmaking', 'jewellery']
const TIERS = [
  { value: 'standard', label: 'Standard', desc: '1 vertical · 2 submissions/month' },
  { value: 'premium', label: 'Premium', desc: 'Multiple verticals · 6 submissions/month · priority review' },
  { value: 'founding', label: 'Founding', desc: 'Premium access · price-protected · founding badge' },
]

function PartnerForm({ partner, onSave, onCancel }) {
  const [form, setForm] = useState({
    org_name: partner?.org_name || '',
    contact_email: partner?.contact_email || '',
    user_id: partner?.user_id || '',
    tier: partner?.tier || 'standard',
    verticals: partner?.verticals || [],
    active: partner?.active ?? true,
    description: partner?.description || '',
    website: partner?.website || '',
    logo_url: partner?.logo_url || '',
    slug: partner?.slug || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const input = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--bg)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7, display: 'block', fontFamily: 'var(--font-sans)' }

  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

  function toggleVertical(v) {
    const maxVerticals = form.tier === 'standard' ? 1 : 10
    if (form.verticals.includes(v)) {
      setForm(f => ({ ...f, verticals: f.verticals.filter(x => x !== v) }))
    } else if (form.verticals.length < maxVerticals) {
      setForm(f => ({ ...f, verticals: [...f.verticals, v] }))
    }
  }

  async function handleSave() {
    if (!form.org_name.trim()) { setError('Organisation name is required.'); return }
    if (!form.contact_email.trim()) { setError('Contact email is required.'); return }
    if (!form.user_id.trim()) { setError('Auth user ID is required.'); return }
    if (form.verticals.length === 0) { setError('Select at least one vertical.'); return }
    setSaving(true); setError(null)
    const supabase = getSupabase()
    const payload = { ...form, slug: form.slug || slugify(form.org_name) }
    const result = partner?.id
      ? await supabase.from('partners').update(payload).eq('id', partner.id)
      : await supabase.from('partners').insert(payload)
    setSaving(false)
    if (result.error) { setError(result.error.message); return }
    onSave()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-sans)', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 2L4 7l5 5"/></svg> Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--text)', margin: 0 }}>{partner ? 'Edit Partner' : 'Add Partner'}</h2>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 24px', border: 'none', borderRadius: 3, background: 'var(--primary)', color: 'var(--bg)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : partner ? 'Save Changes' : 'Create Partner'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', background: 'rgba(139,74,74,0.1)', border: '1px solid rgba(139,74,74,0.4)', borderRadius: 3, color: '#c05a5a', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={lbl}>Organisation Name</label>
            <input style={input} value={form.org_name} onChange={e => setForm(f => ({ ...f, org_name: e.target.value, slug: partner ? f.slug : slugify(e.target.value) }))} placeholder="Visit Yarra Valley" />
          </div>
          <div>
            <label style={lbl}>Contact Email</label>
            <input style={input} type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="hello@example.com.au" />
          </div>
          <div>
            <label style={lbl}>Auth User ID</label>
            <input style={{ ...input, fontFamily: 'monospace', fontSize: 12 }} value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} placeholder="Supabase auth.users UUID" />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, fontFamily: 'var(--font-sans)' }}>Find in Supabase → Authentication → Users</div>
          </div>
          <div>
            <label style={lbl}>Slug</label>
            <input style={input} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="visit-yarra-valley" />
          </div>
          <div>
            <label style={lbl}>Website</label>
            <input style={input} type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" />
          </div>
          <div>
            <label style={lbl}>Logo URL</label>
            <input style={input} type="url" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://…" />
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description for the partner directory…" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <label style={lbl}>Tier</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TIERS.map(t => (
                <label key={t.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `1px solid ${form.tier === t.value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 3, cursor: 'pointer', background: form.tier === t.value ? 'rgba(200,148,58,0.06)' : 'transparent' }}>
                  <input type="radio" name="tier" value={t.value} checked={form.tier === t.value} onChange={() => setForm(f => ({ ...f, tier: t.value, verticals: t.value === 'standard' ? f.verticals.slice(0, 1) : f.verticals }))} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <label style={lbl}>Verticals {form.tier === 'standard' && <span style={{ opacity: 0.5, fontWeight: 400 }}>(max 1)</span>}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VERTICALS.map(v => (
                <button key={v} onClick={() => toggleVertical(v)} style={{ padding: '5px 12px', border: `1px solid ${form.verticals.includes(v) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 3, background: form.verticals.includes(v) ? 'rgba(200,148,58,0.12)' : 'transparent', color: form.verticals.includes(v) ? 'var(--primary)' : 'var(--text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
            <label style={{ ...lbl, marginBottom: 10 }}>Status</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              <span style={{ fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text-2)' }}>Active — partner can log in and submit</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

function PartnersTab() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  useEffect(() => { if (!editing) fetchPartners() }, [editing])

  async function fetchPartners() {
    setLoading(true)
    const { data } = await getSupabase().from('partners').select('*').order('created_at', { ascending: false })
    setPartners(data || []); setLoading(false)
  }

  async function toggleActive(partner) {
    await getSupabase().from('partners').update({ active: !partner.active }).eq('id', partner.id)
    fetchPartners()
  }

  if (editing) return <PartnerForm partner={editing === 'new' ? null : editing} onSave={() => setEditing(null)} onCancel={() => setEditing(null)} />

  const TIER_COLOR = { standard: '#4a7c59', premium: '#c8943a', founding: '#7c4a9e' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Partners</h1>
        <button onClick={() => setEditing('new')} style={{ padding: '10px 22px', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
          Add Partner
        </button>
      </div>
      {loading ? <div style={{ color: 'var(--text-3)', fontSize: 14, fontFamily: 'var(--font-sans)', padding: '40px 0' }}>Loading...</div>
      : partners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>No partners yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28, fontFamily: 'var(--font-sans)' }}>Add your first partner to get started.</div>
          <button onClick={() => setEditing('new')} style={{ padding: '11px 28px', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>+ Add Partner</button>
        </div>
      ) : partners.map(p => (
        <div key={p.id} style={{ padding: '16px 18px', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${p.active ? TIER_COLOR[p.tier] || 'var(--primary)' : 'var(--border)'}`, opacity: p.active ? 1 : 0.6 }}>
          {p.logo_url && <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)' }}><img src={p.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3, fontFamily: 'var(--font-sans)' }}>{p.org_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>{p.contact_email}</span>
              {(p.verticals || []).map(v => <span key={v} style={{ color: 'var(--primary)', opacity: 0.8 }}>{v}</span>)}
            </div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 12, background: `${TIER_COLOR[p.tier] || '#888'}18`, color: TIER_COLOR[p.tier] || '#888', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{p.tier}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => toggleActive(p)} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>{p.active ? 'Deactivate' : 'Activate'}</button>
            <button onClick={() => setEditing(p)} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-sans)' }}>Edit</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Submissions Review Tab ───────────────────────────────────────────────────
const SUB_STATUS = {
  draft:        { label: 'Draft',        color: '#888',    bg: 'rgba(136,136,136,0.1)' },
  under_review: { label: 'Under Review', color: '#c8943a', bg: 'rgba(200,148,58,0.1)'  },
  approved:     { label: 'Approved',     color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'   },
  revision_requested: { label: 'Revision Requested', color: '#7c6a3a', bg: 'rgba(124,106,58,0.1)' },
  rejected:     { label: 'Rejected',     color: '#8b4a4a', bg: 'rgba(139,74,74,0.1)'   },
}

function SubmissionsTab() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('under_review')
  const [reviewing, setReviewing] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSubmissions() }, [filter])

  async function fetchSubmissions() {
    setLoading(true)
    const supabase = getSupabase()
    let q = supabase.from('partner_submissions')
      .select('*, partners(org_name, tier)')
      .order('submitted_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setSubmissions(data || []); setLoading(false)
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function updateStatus(sub, status) {
    setSaving(true)
    const supabase = getSupabase()
    const now = new Date().toISOString()

    if (status === 'approved') {
      // Generate a unique slug from the title
      const baseSlug = slugify(sub.title || 'partner-content')
      const slug = `${baseSlug}-${Date.now().toString(36)}`

      // Update the submission with slug + status
      await supabase.from('partner_submissions').update({
        status,
        slug,
        reviewer_notes: notes,
        reviewed_at: now,
      }).eq('id', sub.id)

      // Insert into articles table so it renders in the Journal
      await supabase.from('articles').insert({
        title: sub.title,
        slug,
        deck: sub.excerpt,
        body: sub.body,
        hero_image_url: sub.hero_image_url,
        category: sub.vertical || 'Partner',
        tags: sub.tags || [],
        status: 'published',
        published_at: now,
        created_at: now,
        updated_at: now,
        is_partner_content: true,
        partner_id: sub.partner_id,
        meta_description: `Produced in partnership with ${sub.partners?.org_name || 'a partner organisation'}. Editorial standards apply.`,
      })
    } else {
      await supabase.from('partner_submissions').update({
        status,
        reviewer_notes: notes,
        reviewed_at: now,
      }).eq('id', sub.id)
    }

    setSaving(false)
    setReviewing(null)
    setNotes('')
    fetchSubmissions()
  }

  const counts = { under_review: submissions.filter(s => s.status === 'under_review').length }

  if (reviewing) {
    const s = reviewing
    const meta = SUB_STATUS[s.status] || SUB_STATUS.draft
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button onClick={() => { setReviewing(null); setNotes('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-sans)', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 2L4 7l5 5"/></svg> Back
          </button>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--text)', margin: 0 }}>Review Submission</h2>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 12, background: meta.bg, color: meta.color, fontFamily: 'var(--font-sans)' }}>{meta.label}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => updateStatus(s, 'revision_requested')} disabled={saving} style={{ padding: '9px 20px', border: '1px solid rgba(139,74,74,0.4)', borderRadius: 3, background: 'rgba(139,74,74,0.08)', color: '#8b4a4a', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
              Request Revision
            </button>
            <button onClick={() => updateStatus(s, 'approved')} disabled={saving} style={{ padding: '9px 20px', border: 'none', borderRadius: 3, background: '#4a7c59', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
              {saving ? 'Saving…' : 'Approve & Publish'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
          <div>
            {s.hero_image_url && <div style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: 3, marginBottom: 20, background: 'var(--bg-2)' }}><img src={s.hero_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.01em' }}>{s.title || 'Untitled'}</h1>
            {s.excerpt && <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24, borderLeft: '3px solid var(--primary)', paddingLeft: 16, fontStyle: 'italic' }}>{s.excerpt}</p>}
            <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-2)', fontFamily: 'var(--font-serif)' }} dangerouslySetInnerHTML={{ __html: mdToHtml(s.body) }} />
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                <strong style={{ color: 'var(--primary)' }}>Partner content.</strong> Produced in partnership with {s.partners?.org_name}. Editorial standards apply.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>Submission Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Partner', s.partners?.org_name],
                  ['Tier', s.partners?.tier],
                  ['Vertical', s.vertical],
                  ['Region', s.region],
                  ['Submitted', s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
                ].map(([k, v]) => v ? (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                    <span style={{ color: 'var(--text-3)' }}>{k}</span>
                    <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{v}</span>
                  </div>
                ) : null)}
                {(s.tags || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Tags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.tags.map(t => <span key={t} style={{ padding: '2px 8px', background: 'rgba(200,148,58,0.12)', border: '1px solid rgba(200,148,58,0.2)', borderRadius: 3, fontSize: 10, color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Reviewer Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes sent to partner if requesting revision…"
                style={{ width: '100%', minHeight: 100, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--bg)', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, fontFamily: 'var(--font-sans)' }}>Visible to the partner if you request revision.</div>
            </div>

            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>Feed Settings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 5, fontFamily: 'var(--font-sans)' }}>Publish Until</div>
                  <input type="date" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 3, fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--bg)', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
          Submissions
          {counts.under_review > 0 && <span style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#c8943a', color: '#fff', fontSize: 11, fontWeight: 700, verticalAlign: 'middle' }}>{counts.under_review}</span>}
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {['under_review', 'approved', 'rejected', 'draft', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: filter === f ? 'var(--text)' : 'var(--text-3)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -1, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>
      {loading ? <div style={{ color: 'var(--text-3)', fontSize: 14, fontFamily: 'var(--font-sans)', padding: '40px 0' }}>Loading...</div>
      : submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>No submissions</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Partner submissions will appear here for review.</div>
        </div>
      ) : submissions.map(s => {
        const meta = SUB_STATUS[s.status] || SUB_STATUS.draft
        return (
          <div key={s.id} style={{ padding: '16px 18px', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${meta.color}`, cursor: 'pointer', transition: 'background 0.1s' }}
            onClick={() => { setReviewing(s); setNotes(s.reviewer_notes || '') }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-sans)' }}>{s.title || 'Untitled draft'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', display: 'flex', gap: 10 }}>
                <span>{s.partners?.org_name}</span>
                {s.vertical && <span>{s.vertical}</span>}
                {s.region && <span>{s.region}</span>}
                {s.submitted_at && <span>{new Date(s.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
              </div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 12, background: meta.bg, color: meta.color, whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{meta.label}</div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-3)" strokeWidth="1.8"><path d="M5 2l5 5-5 5"/></svg>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Admin ───────────────────────────────────────────────────────────────
const SC = { pending: '#c8943a', approved: '#4a7c59', rejected: '#8b4a4a' }

export default function AdminPage() {
  const [tab, setTab] = useState('claims')
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [updating, setUpdating] = useState(null)

  useEffect(() => { if (tab === 'claims') fetchClaims() }, [filter, tab])

  async function fetchClaims() {
    setLoading(true)
    const supabase = getSupabase()
    let q = supabase.from('claims').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    if (!error && data) setClaims(data)
    setLoading(false)
  }

  async function updateStatus(id, status) {
    setUpdating(id)
    const supabase = getSupabase()
    await supabase.from('claims').update({ status }).eq('id', id)
    if (status === 'approved') {
      const claim = claims.find(c => c.id === id)
      // is_claimed column removed — claim status tracked via claims table
    }
    fetchClaims(); setUpdating(null)
  }

  const counts = { pending: claims.filter(c => c.status === 'pending').length, approved: claims.filter(c => c.status === 'approved').length, rejected: claims.filter(c => c.status === 'rejected').length }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Admin</div>
      <div style={{ display: 'flex', gap: 28, borderBottom: '2px solid var(--border)', marginBottom: 36 }}>
        {[['claims','Listing Claims'],['articles','Articles'],['partners','Partners'],['submissions','Submissions'],['analytics','Analytics'],['newsletter','Newsletter', '/admin/newsletter']].map(([t, label, href]) => (
          <button key={t} onClick={() => href ? window.location.href = href : setTab(t)} style={{ padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', color: tab === t ? 'var(--text)' : 'var(--text-3)', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -2 }}>{label}</button>
        ))}
      </div>
      {tab === 'analytics' && <AnalyticsDashboard />}
      {tab === 'articles' && <ArticlesTab />}
      {tab === 'partners' && <PartnersTab />}
      {tab === 'submissions' && <SubmissionsTab />}
      {tab === 'claims' && (
        <>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 24 }}>Listing Claims</h1>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {['pending','approved','rejected'].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 3 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: SC[s], color: '#fff', fontSize: 11, fontWeight: 700 }}>{counts[s]}</span>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
            {['pending','approved','rejected','all'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: filter === f ? 'var(--text)' : 'var(--text-3)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -1, fontFamily: 'var(--font-sans)' }}>{f}</button>
            ))}
          </div>
          {loading ? <div style={{ color: 'var(--text-3)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>Loading...</div> : claims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>No claims yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Claims will appear here when venue owners submit them.</div>
            </div>
          ) : claims.map(claim => (
            <div key={claim.id} style={{ padding: 20, marginBottom: 10, border: '1px solid var(--border)', borderRadius: 3, borderLeft: `3px solid ${SC[claim.status] || 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>{claim.venue_name || 'Unknown Venue'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>{claim.contact_name} · {claim.contact_email}</div>
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 12, background: SC[claim.status] + '18', color: SC[claim.status], fontFamily: 'var(--font-sans)' }}>{claim.status}</div>
              </div>
              {claim.message && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Message</div><div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 3, fontFamily: 'var(--font-sans)' }}>{claim.message}</div></div>}
              <div style={{ display: 'flex', gap: 8 }}>
                {claim.status !== 'approved' && <button onClick={() => updateStatus(claim.id, 'approved')} disabled={updating === claim.id} style={{ background: '#4a7c59', color: '#fff', padding: '8px 18px', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', opacity: updating === claim.id ? 0.6 : 1 }}>✓ Approve</button>}
                {claim.status !== 'rejected' && <button onClick={() => updateStatus(claim.id, 'rejected')} disabled={updating === claim.id} style={{ background: '#8b4a4a', color: '#fff', padding: '8px 18px', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', opacity: updating === claim.id ? 0.6 : 1 }}>✕ Reject</button>}
                {claim.status !== 'pending' && <button onClick={() => updateStatus(claim.id, 'pending')} disabled={updating === claim.id} style={{ background: 'rgba(200,148,58,0.12)', color: 'var(--primary)', border: '1px solid rgba(200,148,58,0.3)', padding: '8px 18px', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>↺ Pending</button>}
                <a href={`mailto:${claim.contact_email}?subject=Your listing claim on Craft Atlas — ${claim.venue_name}`} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '8px 18px', borderRadius: 3, fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>✉ Email</a>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
