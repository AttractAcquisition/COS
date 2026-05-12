import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { formatDate, formatRand } from '../lib/utils'

const EMPTY_FORM = {
  id: '' as string,
  date_key: new Date().toISOString().split('T')[0],
  profile_visits: 0,
  dms_started: 0,
  qualified_followers: 0,
  appointments_booked: 0,
  cash_collected: 0,
  notes: '',
}

export default function DeliveryMetricsPanel({ title, subtitle, clientId }: { title: string; subtitle: string; clientId: string }) {
  const { user, metadata_id } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadRows() }, [clientId])

  async function loadRows() {
    setLoading(true)
    const { data } = await supabase.from('delivery_metrics').select('*').eq('client_id', clientId).order('date_key', { ascending: false }).limit(30)
    const list = data || []
    setRows(list)
    if (list[0]) {
      const top = list[0]
      setForm({
        id: top.id,
        date_key: top.date_key || EMPTY_FORM.date_key,
        profile_visits: top.profile_visits || 0,
        dms_started: top.dms_started || 0,
        qualified_followers: top.qualified_followers || 0,
        appointments_booked: top.appointments_booked || 0,
        cash_collected: top.cash_collected || 0,
        notes: top.notes || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setLoading(false)
  }

  async function saveRow() {
    setSaving(true)
    const payload = {
      client_id: clientId,
      manager_id: user?.id || metadata_id || null,
      date_key: form.date_key,
      profile_visits: Number(form.profile_visits) || 0,
      dms_started: Number(form.dms_started) || 0,
      qualified_followers: Number(form.qualified_followers) || 0,
      appointments_booked: Number(form.appointments_booked) || 0,
      cash_collected: Number(form.cash_collected) || 0,
      notes: form.notes || '',
      updated_at: new Date().toISOString(),
    }

    const existing = await supabase.from('delivery_metrics').select('id').eq('client_id', clientId).eq('date_key', form.date_key).maybeSingle()
    const existingId = existing.data?.id ?? null
    if (existingId) {
      const { error } = await supabase.from('delivery_metrics').update(payload).eq('id', existingId)
      if (error) {
        toast(`Failed to save row: ${error.message}`, 'error')
        setSaving(false)
        return
      }
      setForm((prev: any) => ({ ...prev, id: existingId }))
    } else {
      const { error } = await supabase.from('delivery_metrics').insert(payload)
      if (error) {
        toast(`Failed to save row: ${error.message}`, 'error')
        setSaving(false)
        return
      }
    }

    toast('Live pipeline row saved ✓')
    setSaving(false)
    await loadRows()
  }

  const totals = useMemo(() => {
    return {
      profileVisits: rows.reduce((sum, row) => sum + (row.profile_visits || 0), 0),
      dmsStarted: rows.reduce((sum, row) => sum + (row.dms_started || 0), 0),
      qualifiedFollowers: rows.reduce((sum, row) => sum + (row.qualified_followers || 0), 0),
      bookedCalls: rows.reduce((sum, row) => sum + (row.appointments_booked || 0), 0),
      cashCollected: rows.reduce((sum, row) => sum + (row.cash_collected || 0), 0),
    }
  }, [rows])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, color: 'var(--grey)' }}>
        <Loader2 className="spin" size={18} style={{ marginRight: 10 }} />
        Loading live pipeline inputs...
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="section-label" style={{ margin: 0 }}>{title}</div>
        <div style={{ color: 'var(--grey)', fontSize: 12, marginTop: 4 }}>{subtitle}</div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <Field label="Date">
            <input className="input" type="date" value={form.date_key} onChange={e => setForm((p: any) => ({ ...p, date_key: e.target.value }))} />
          </Field>
          <Field label="Profile Visits">
            <input className="input" type="number" value={form.profile_visits} onChange={e => setForm((p: any) => ({ ...p, profile_visits: Number(e.target.value) }))} />
          </Field>
          <Field label="DMs Started">
            <input className="input" type="number" value={form.dms_started} onChange={e => setForm((p: any) => ({ ...p, dms_started: Number(e.target.value) }))} />
          </Field>
          <Field label="Qualified Followers">
            <input className="input" type="number" value={form.qualified_followers} onChange={e => setForm((p: any) => ({ ...p, qualified_followers: Number(e.target.value) }))} />
          </Field>
          <Field label="Booked Calls">
            <input className="input" type="number" value={form.appointments_booked} onChange={e => setForm((p: any) => ({ ...p, appointments_booked: Number(e.target.value) }))} />
          </Field>
          <Field label="Cash Collected">
            <input className="input" type="number" value={form.cash_collected} onChange={e => setForm((p: any) => ({ ...p, cash_collected: Number(e.target.value) }))} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input" rows={3} value={form.notes} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Daily pipeline context, blockers, wins, follow-ups..." />
        </Field>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={saveRow} disabled={saving}>{saving ? 'Saving...' : 'Save Pipeline Row →'}</button>
          <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--grey)' }}>
            Totals, visits: {totals.profileVisits.toLocaleString('en-ZA')} · DMs: {totals.dmsStarted.toLocaleString('en-ZA')} · cash: {formatRand(totals.cashCollected)}
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>Recent Live Pipeline Entries</div>
        {rows.length === 0 ? (
          <div style={{ color: 'var(--grey)', fontSize: 13, padding: 16, border: '1px dashed var(--border2)', borderRadius: 10 }}>
            No live pipeline rows entered yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="aa-table">
              <thead>
                <tr>
                  <th>Date</th><th>Visits</th><th>DMs</th><th>Qualified</th><th>Booked</th><th>Cash</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date_key)}</td>
                    <td>{(row.profile_visits || 0).toLocaleString('en-ZA')}</td>
                    <td>{row.dms_started || 0}</td>
                    <td>{row.qualified_followers || 0}</td>
                    <td>{row.appointments_booked || 0}</td>
                    <td>{formatRand(row.cash_collected)}</td>
                    <td>{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
    </div>
  )
}
