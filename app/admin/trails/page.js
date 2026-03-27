'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

const supabase = getSupabase()

export default function AdminTrailsPage() {
  const [trails, setTrails] = useState([])
  const [view, setView] = useState('list')
  const [editingTrail, setEditingTrail] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTrails = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('trails').select('*, trail_venues(count)').order('created_at', { ascending: false })
    setTrails(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTrails() }, [fetchTrails])

  async function togglePublish(trail) {
    await supabase.from('trails').update({ published: !trail.published }).eq('id', trail.id)
    fetchTrails()
  }

  async function deleteTrail(id) {
    if (!confirm('Delete this trail? This cannot be undone.')) return
    await supabase.from('trails').delete().eq('id', id)
    fetchTrails()
  }

  if (view === 'edit') {
    return <TrailEditor trail={editingTrail} onBack={() => { setView('list'); setEditingTrail(null); fetchTrails() }} />
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tasting Trails</h1>
          <p className="text-stone-500 text-sm mt-1">{trails.length} trail{trails.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditingTrail(null); setView('edit') }} className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors">+ New Trail</button>
      </div>
      {loading ? <div className="text-stone-400 text-center py-16">Loading…</div> : trails.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="mb-4">No trails yet.</p>
          <button onClick={() => setView('edit')} className="text-amber-700 font-semibold">Create your first trail →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {trails.map(trail => (
            <div key={trail.id} className="bg-white border border-stone-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900">{trail.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trail.published ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                    {trail.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{trail.trail_venues?.[0]?.count ?? 0} stops{trail.region ? ` · ${trail.region}` : ''} · /trails/{trail.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => togglePublish(trail)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${trail.published ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {trail.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => { setEditingTrail(trail); setView('edit') }} className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors">Edit</button>
                <button onClick={() => deleteTrail(trail.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrailEditor({ trail, onBack }) {
  const isNew = !trail
  const [form, setForm] = useState({
    name: trail?.name || '', slug: trail?.slug || '', description: trail?.description || '',
    hero_image_url: trail?.hero_image_url || '', curator_name: trail?.curator_name || '',
    curator_note: trail?.curator_note || '', region: trail?.region || '', published: trail?.published || false,
  })
  const [stops, setStops] = useState([])
  const [venueSearch, setVenueSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [saving, setSaving] = useState(false)
  const [trailId, setTrailId] = useState(trail?.id || null)

  useEffect(() => {
    if (!trail?.id) return
    supabase.from('trail_venues').select('id,position,stop_note,venues(id,name,suburb,state,type,slug)').eq('trail_id', trail.id).order('position').then(({ data }) => setStops(data || []))
  }, [trail?.id])

  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    setForm(f => ({ ...f, name, slug: isNew ? slug : f.slug }))
  }

  useEffect(() => {
    if (venueSearch.length < 2) { setSearchResults([]); return }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from('venues').select('id,name,suburb,state,type').ilike('name', `%${venueSearch}%`).limit(8)
      const addedIds = stops.map(s => s.venues?.id)
      setSearchResults((data || []).filter(v => !addedIds.includes(v.id)))
    }, 300)
    return () => clearTimeout(timeout)
  }, [venueSearch, stops])

  async function saveTrail() {
    setSaving(true)
    try {
      if (!trailId) {
        const { data, error } = await supabase.from('trails').insert(form).select().single()
        if (error) throw error
        setTrailId(data.id)
        return data.id
      } else {
        await supabase.from('trails').update(form).eq('id', trailId)
        return trailId
      }
    } finally { setSaving(false) }
  }

  async function addStop(venue) {
    let id = trailId
    if (!id) { id = await saveTrail(); if (!id) return }
    const { data, error } = await supabase.from('trail_venues').insert({ trail_id: id, venue_id: venue.id, position: stops.length }).select('id,position,stop_note,venues(id,name,suburb,state,type,slug)').single()
    if (!error) { setStops(s => [...s, data]); setVenueSearch(''); setSearchResults([]) }
  }

  async function removeStop(stopId) {
    await supabase.from('trail_venues').delete().eq('id', stopId)
    const updated = stops.filter(s => s.id !== stopId)
    await Promise.all(updated.map((s, i) => supabase.from('trail_venues').update({ position: i }).eq('id', s.id)))
    setStops(updated.map((s, i) => ({ ...s, position: i })))
  }

  async function moveStop(index, direction) {
    const newStops = [...stops]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newStops.length) return
    ;[newStops[index], newStops[swapIndex]] = [newStops[swapIndex], newStops[index]]
    const updated = newStops.map((s, i) => ({ ...s, position: i }))
    setStops(updated)
    await Promise.all(updated.map(s => supabase.from('trail_venues').update({ position: s.position }).eq('id', s.id)))
  }

  async function updateStopNote(stopId, note) {
    setStops(s => s.map(stop => stop.id === stopId ? { ...stop, stop_note: note } : stop))
    await supabase.from('trail_venues').update({ stop_note: note }).eq('id', stopId)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-900 mb-6">← Back to trails</button>
      <h1 className="text-2xl font-bold text-stone-900 mb-8">{isNew ? 'New Trail' : `Edit: ${trail.name}`}</h1>
      <div className="space-y-8">
        <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-stone-800">Trail Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Name *</label>
              <input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Yarra Valley Makers Trail" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Slug *</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Region</label>
              <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Yarra Valley" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Curator Name</label>
              <input value={form.curator_name} onChange={e => setForm(f => ({ ...f, curator_name: e.target.value }))} placeholder="Small Batch Atlas" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Curator Note</label>
            <textarea value={form.curator_note} onChange={e => setForm(f => ({ ...f, curator_note: e.target.value }))} rows={3} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Hero Image URL</label>
            <input value={form.hero_image_url} onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="rounded" />
            <label htmlFor="published" className="text-sm text-stone-700">Published (visible on site)</label>
          </div>
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="font-semibold text-stone-800 mb-4">Stops ({stops.length})</h2>
          <div className="relative mb-6">
            <input value={venueSearch} onChange={e => setVenueSearch(e.target.value)} placeholder="Search venues to add…" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-lg z-20 mt-1 max-h-64 overflow-y-auto">
                {searchResults.map(venue => (
                  <button key={venue.id} onClick={() => addStop(venue)} className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors border-b border-stone-100 last:border-0">
                    <p className="font-medium text-stone-900 text-sm">{venue.name}</p>
                    <p className="text-xs text-stone-400">{[venue.suburb, venue.state, venue.type].filter(Boolean).join(' · ')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {stops.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-6">Search for venues above to add stops.</p>
          ) : (
            <div className="space-y-3">
              {stops.map((stop, index) => (
                <StopRow key={stop.id} stop={stop} index={index} total={stops.length}
                  onMoveUp={() => moveStop(index, -1)} onMoveDown={() => moveStop(index, 1)}
                  onRemove={() => removeStop(stop.id)} onNoteChange={(note) => updateStopNote(stop.id, note)} />
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <button onClick={async () => { await saveTrail(); onBack() }} disabled={saving || !form.name || !form.slug} className="flex-1 bg-amber-700 text-white py-3 rounded-xl font-semibold hover:bg-amber-800 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : isNew ? 'Create Trail' : 'Save Changes'}
          </button>
          <button onClick={onBack} className="px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function StopRow({ stop, index, total, onMoveUp, onMoveDown, onRemove, onNoteChange }) {
  const venue = stop.venues
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(stop.stop_note || '')
  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-stone-50">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-amber-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-900 text-sm truncate">{venue?.name}</p>
          <p className="text-xs text-stone-400">{[venue?.suburb, venue?.state, venue?.type].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setNoteOpen(o => !o)} className="text-xs px-2 py-1 rounded bg-stone-200 text-stone-600 hover:bg-stone-300" title="Add note">📝</button>
          <button onClick={onMoveUp} disabled={index === 0} className="text-xs px-2 py-1 rounded bg-stone-200 text-stone-600 hover:bg-stone-300 disabled:opacity-30">↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-xs px-2 py-1 rounded bg-stone-200 text-stone-600 hover:bg-stone-300 disabled:opacity-30">↓</button>
          <button onClick={onRemove} className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200">✕</button>
        </div>
      </div>
      {noteOpen && (
        <div className="mt-3 pt-3 border-t border-stone-200">
          <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => onNoteChange(note)} rows={2} placeholder="Why this stop is worth visiting…" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500 resize-none" />
        </div>
      )}
    </div>
  )
}
