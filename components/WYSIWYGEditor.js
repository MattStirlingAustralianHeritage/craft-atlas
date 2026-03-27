'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Markdown ↔ HTML ──────────────────────────────────────────────────────────
export function mdToHtml(md) {
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

export function htmlToMd(el) {
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
    if (tag === 'code') return '`' + inner + '`'
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

export function getWordCount(el) {
  if (!el) return 0
  return (el.innerText || '').trim().split(/\s+/).filter(w => w.length > 0).length
}

// ─── WYSIWYG Editor ───────────────────────────────────────────────────────────
export default function WYSIWYGEditor({ value, onUploadImage, uploading }) {
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

  function handleInput() {
    setWordCount(getWordCount(editorRef.current))
  }

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
    updateBubble()
    updateFormats()
    if (e.key === '/' || e.key === 'Backspace' || (slashMenu && !['ArrowUp','ArrowDown','Enter','Tab','Escape'].includes(e.key))) {
      checkSlash()
    }
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
    e?.preventDefault()
    restoreRange()
    editorRef.current?.focus()
    if (linkUrl.trim()) document.execCommand('createLink', false, linkUrl.trim())
    else document.execCommand('unlink')
    setLinkPop(null); setLinkUrl('')
  }

  function removeLink() {
    restoreRange()
    editorRef.current?.focus()
    document.execCommand('unlink')
    setLinkPop(null); setLinkUrl('')
  }

  function getSlashCmds(query) {
    const ALL = [
      { cmd: 'h1',         label: 'Heading 1',    desc: 'Large section heading',  icon: 'H₁', keys: 'h1' },
      { cmd: 'h2',         label: 'Heading 2',    desc: 'Medium section heading', icon: 'H₂', keys: 'h2' },
      { cmd: 'h3',         label: 'Heading 3',    desc: 'Small section heading',  icon: 'H₃', keys: 'h3' },
      { cmd: 'ul',         label: 'Bullet List',  desc: 'Unordered list',         icon: '•',  keys: 'ul list bullet' },
      { cmd: 'ol',         label: 'Numbered List',desc: 'Ordered list',           icon: '①', keys: 'ol number ordered' },
      { cmd: 'blockquote', label: 'Quote',        desc: 'Highlighted pullquote',  icon: '❝',  keys: 'quote blockquote' },
      { cmd: 'hr',         label: 'Divider',      desc: 'Horizontal rule',        icon: '—',  keys: 'hr divider line' },
      { cmd: 'image',      label: 'Image',        desc: 'Upload from computer',   icon: '🖼', keys: 'image photo img' },
    ]
    if (!query) return ALL
    return ALL.filter(c =>
      c.label.toLowerCase().includes(query) ||
      c.cmd.includes(query) ||
      c.keys.includes(query)
    )
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
    } else if (cmd === 'ul') {
      document.execCommand('insertUnorderedList')
    } else if (cmd === 'ol') {
      document.execCommand('insertOrderedList')
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
    } else if (cmd === 'image') {
      document.getElementById('wysiwyg-img-input')?.click()
    }
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

  function execCmd(cmd, value) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    updateFormats()
  }

  async function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) {
      const url = await onUploadImage(file)
      if (url) insertImage(url)
    }
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
      const anchor = (range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer)
        .closest('p,h1,h2,h3,div,blockquote,figure') || range.startContainer
      anchor.after(p); anchor.after(figure)
    } else {
      editorRef.current.appendChild(figure)
      editorRef.current.appendChild(p)
    }
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
      style={{ padding: '5px 9px', border: 'none', borderRadius: 3, cursor: 'pointer', background: active ? 'rgba(200,148,58,0.15)' : 'transparent', color: active ? 'var(--amber)' : 'var(--text-2)', fontSize: 13, fontWeight: 600, lineHeight: 1, transition: 'all 0.1s', fontFamily: 'var(--font-sans)', ...extraStyle }}>
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
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6.5 9.5a4 4 0 005.66 0l2-2a4 4 0 00-5.65-5.66L7.35 3"/>
            <path d="M9.5 6.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.65 5.66L8.65 13"/>
          </svg>
        </TB>
        <Sep />
        <TB title="Bullet list · type /ul" active={activeFormats.ul} onClick={() => execCmd('insertUnorderedList')}>
          <svg width="14" height="13" viewBox="0 0 14 13" fill="none">
            <circle cx="2" cy="2.5" r="1.4" fill="currentColor"/>
            <line x1="5.5" y1="2.5" x2="13" y2="2.5" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="2" cy="6.5" r="1.4" fill="currentColor"/>
            <line x1="5.5" y1="6.5" x2="13" y2="6.5" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="2" cy="10.5" r="1.4" fill="currentColor"/>
            <line x1="5.5" y1="10.5" x2="13" y2="10.5" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </TB>
        <TB title="Numbered list · type /ol" active={activeFormats.ol} onClick={() => execCmd('insertOrderedList')}>
          <svg width="14" height="13" viewBox="0 0 14 13" fill="currentColor">
            <text x="0" y="4.5" fontSize="5.5" fontFamily="serif">1.</text>
            <line x1="5.5" y1="2.5" x2="13" y2="2.5" stroke="currentColor" strokeWidth="1.6"/>
            <text x="0" y="8.5" fontSize="5.5" fontFamily="serif">2.</text>
            <line x1="5.5" y1="6.5" x2="13" y2="6.5" stroke="currentColor" strokeWidth="1.6"/>
            <text x="0" y="12.5" fontSize="5.5" fontFamily="serif">3.</text>
            <line x1="5.5" y1="10.5" x2="13" y2="10.5" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </TB>
        <Sep />
        <TB title="Blockquote · type /quote" onClick={() => execCmd('formatBlock', 'blockquote')}>
          <svg width="13" height="11" viewBox="0 0 14 12" fill="currentColor">
            <path d="M0 12V7.5C0 4.26 1.72 1.88 5.16.3L6 1.7C4.04 2.6 2.96 3.82 2.78 5.5H5V12H0zm8 0V7.5c0-3.24 1.72-5.62 5.16-7.2L14 1.7c-1.96.9-3.04 2.12-3.22 3.8H13V12H8z"/>
          </svg>
        </TB>
        <TB title="Divider · type /hr" onClick={() => {
          editorRef.current?.focus()
          const sel = window.getSelection()
          if (!sel?.rangeCount) return
          const range = sel.getRangeAt(0)
          const block = (range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer).closest('p,h1,h2,h3,div,blockquote') || range.startContainer
          const hr = document.createElement('hr')
          const p = document.createElement('p'); p.innerHTML = '<br>'
          block.after(p); block.after(hr)
          const r = document.createRange(); r.setStart(p, 0); r.collapse(true)
          sel.removeAllRanges(); sel.addRange(r)
        }}>
          <svg width="14" height="10" viewBox="0 0 14 10"><line x1="0" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.6"/></svg>
        </TB>
        <Sep />
        <label title="Insert image · type /image · or drag & drop" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', cursor: uploading ? 'wait' : 'pointer', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', borderRadius: 3 }}>
          <svg width="14" height="13" viewBox="0 0 16 15" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="1" y="2" width="14" height="11" rx="1.5"/>
            <circle cx="5.5" cy="5.5" r="1.3"/>
            <path d="M1 11l3.5-3.5 3 3 2.5-2.5 4 4"/>
          </svg>
          {uploading ? 'Uploading…' : 'Image'}
          <input id="wysiwyg-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
            if (e.target.files[0]) { const url = await onUploadImage(e.target.files[0]); if (url) insertImage(url) }
            e.target.value = ''
          }} />
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, fontSize: 10, lineHeight: 1.7 }}>/</kbd> for blocks
          </span>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Start writing, or type / to insert a block..."
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseUp={updateBubble}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={{ minHeight: 480, padding: '28px 32px', outline: 'none', fontSize: 17, fontFamily: 'var(--font-serif)', color: 'var(--text)', lineHeight: 1.85 }}
      />

      {bubble && bubble.y > -200 && (
        <div ref={bubbleRef} style={{ position: 'absolute', left: bubble.x, top: bubble.y, transform: 'translateX(-50%)', background: '#1c1c1c', borderRadius: 8, padding: '3px 5px', display: 'flex', gap: 1, alignItems: 'center', boxShadow: '0 6px 28px rgba(0,0,0,0.4)', zIndex: 50, whiteSpace: 'nowrap', animation: 'bubbleIn 0.1s ease-out' }}>
          <BB title="Bold ⌘B" active={bubble.bold} onClick={() => { execCmd('bold'); updateBubble() }}><span style={{ fontWeight: 800 }}>B</span></BB>
          <BB title="Italic ⌘I" active={bubble.italic} onClick={() => { execCmd('italic'); updateBubble() }}><em style={{ fontStyle: 'italic' }}>I</em></BB>
          <BB title="Strikethrough" active={false} onClick={() => { execCmd('strikeThrough'); updateBubble() }}><span style={{ textDecoration: 'line-through', fontSize: 12 }}>S</span></BB>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 3px' }} />
          <BB title="Link ⌘K" active={false} onClick={openLinkPop}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6.5 9.5a4 4 0 005.66 0l2-2a4 4 0 00-5.65-5.66L7.35 3"/>
              <path d="M9.5 6.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.65 5.66L8.65 13"/>
            </svg>
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
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#666" strokeWidth="2">
            <path d="M6.5 9.5a4 4 0 005.66 0l2-2a4 4 0 00-5.65-5.66L7.35 3"/>
            <path d="M9.5 6.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.65 5.66L8.65 13"/>
          </svg>
          <input autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink(e); if (e.key === 'Escape') setLinkPop(null) }}
            placeholder="Paste or type a URL..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: 'var(--font-sans)', minWidth: 0 }} />
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
        [contenteditable] a { color:var(--amber); text-decoration:underline; text-underline-offset:2px }
        [contenteditable] ul { padding-left:1.5em; margin:0.4em 0 0.7em }
        [contenteditable] ol { padding-left:1.5em; margin:0.4em 0 0.7em }
        [contenteditable] li { margin-bottom:0.3em }
        [contenteditable] blockquote { border-left:3px solid var(--amber); margin:1.2em 0; padding:3px 0 3px 18px; color:var(--text-2); font-style:italic; font-size:1.05em }
        [contenteditable] blockquote p { margin:0 }
        [contenteditable] hr { border:none; border-top:1px solid var(--border); margin:2em 0 }
        [contenteditable] figure { margin:1.5em 0 }
        [contenteditable] figure img { max-width:100%; height:auto; display:block; border-radius:3px }
        [contenteditable] figcaption { margin-top:7px; font-size:13px; color:var(--text-3); font-family:var(--font-sans); font-style:italic; text-align:center }
        [contenteditable] img { max-width:100%; height:auto; display:block; border-radius:3px; margin:1em 0 }
        [contenteditable]:focus { caret-color:var(--amber) }
        [contenteditable] ::selection { background:rgba(200,148,58,0.2) }
      `}</style>
    </div>
  )
}
