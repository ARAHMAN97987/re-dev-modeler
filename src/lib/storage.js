import { supabase, isSupabaseConfigured } from './supabase'

// Storage adapter: Supabase when configured, localStorage as fallback
// Same API as Claude's window.storage

class StorageAdapter {
  constructor() {
    this.useSupabase = isSupabaseConfigured
    this.userId = null // Set after auth
  }

  setUserId(id) {
    this.userId = id
  }

  // ── Supabase methods ──
  async _supaGet(key) {
    const { data, error } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', key)
      .eq('user_id', this.userId || 'anonymous')
      .single()
    if (error || !data) return null
    return { key, value: data.value }
  }

  async _supaSet(key, value) {
    const row = { key, value, user_id: this.userId || 'anonymous', updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('kv_store')
      .upsert(row, { onConflict: 'key,user_id' })
    if (error) { console.error('Storage set error:', error); return null }
    return { key, value }
  }

  async _supaDelete(key) {
    const { error } = await supabase
      .from('kv_store')
      .delete()
      .eq('key', key)
      .eq('user_id', this.userId || 'anonymous')
    return { key, deleted: !error }
  }

  async _supaList(prefix) {
    let query = supabase
      .from('kv_store')
      .select('key')
      .eq('user_id', this.userId || 'anonymous')
    if (prefix) query = query.like('key', `${prefix}%`)
    const { data, error } = await query
    if (error) return { keys: [] }
    return { keys: data.map(d => d.key) }
  }

  // Find shared projects: search all projects where sharedWith contains this user's email
  async getSharedProjects(email) {
    if (!this.useSupabase || !email) return []
    try {
      const { data, error } = await supabase
        .from('kv_store')
        .select('key, value, user_id')
        .like('key', 'redev:project:%')
        .neq('user_id', this.userId || 'anonymous')
      if (error || !data) return []
      // Filter projects that include this email in sharedWith
      return data.filter(row => {
        try {
          const proj = JSON.parse(row.value)
          return Array.isArray(proj.sharedWith) && proj.sharedWith.some(e => e.toLowerCase() === email.toLowerCase())
        } catch { return false }
      }).map(row => ({ key: row.key, value: row.value, ownerId: row.user_id }))
    } catch { return [] }
  }

  // Load a specific project from another user (for shared access)
  async getSharedProject(key, ownerId) {
    if (!this.useSupabase) return null
    try {
      const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .eq('user_id', ownerId)
        .single()
      if (error || !data) return null
      return { key, value: data.value }
    } catch { return null }
  }

  // Save a shared project back to the owner's storage
  async setSharedProject(key, value, ownerId) {
    if (!this.useSupabase) return null
    try {
      const row = { key, value, user_id: ownerId, updated_at: new Date().toISOString() }
      const { error } = await supabase
        .from('kv_store')
        .upsert(row, { onConflict: 'key,user_id' })
      if (error) { console.error('Shared save error:', error); return null }
      return { key, value }
    } catch { return null }
  }

  // ── localStorage methods ──
  _localGet(key) {
    try {
      const val = localStorage.getItem(`redev:${key}`)
      return val !== null ? { key, value: val } : null
    } catch { return null }
  }

  _localSet(key, value) {
    try {
      localStorage.setItem(`redev:${key}`, value)
      return { key, value }
    } catch { return null }
  }

  _localDelete(key) {
    try {
      localStorage.removeItem(`redev:${key}`)
      return { key, deleted: true }
    } catch { return { key, deleted: false } }
  }

  _localList(prefix) {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k.startsWith('redev:')) {
        const cleanKey = k.substring(6)
        if (!prefix || cleanKey.startsWith(prefix)) keys.push(cleanKey)
      }
    }
    return { keys }
  }

  // ── Public API (same as window.storage) ──
  async get(key) {
    if (this.useSupabase) return this._supaGet(key)
    return this._localGet(key)
  }

  async set(key, value) {
    if (this.useSupabase) return this._supaSet(key, value)
    return this._localSet(key, value)
  }

  async delete(key) {
    if (this.useSupabase) return this._supaDelete(key)
    return this._localDelete(key)
  }

  async list(prefix) {
    if (this.useSupabase) return this._supaList(prefix)
    return this._localList(prefix)
  }
}

export const storage = new StorageAdapter()
