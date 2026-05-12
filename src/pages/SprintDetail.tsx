import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatRand, formatDate } from '../lib/utils'
import { ChevronLeft, Plus } from 'lucide-react'
import { useToast } from '../lib/toast'

interface Sprint {
  id: string
  client_name: string | null
  vertical: string | null
  start_date: string
  status: string | null          // ← fixed: allow null
  client_ad_budget: number | null
  actual_ad_spend: number | null
  leads_generated: number | null
  cpl: number | null
  roas: number | null
  revenue_attributed: number | null
  bookings_from_sprint: number | null
  day7_notes: string | null
  day7_sentiment: string | null
  talking_points: string | null
  // add any other fields Supabase returns that you need
  total_reach?: number | null    // optional example if present
}

interface DailyLog {
  id: string
  log_date: string
  day_number: number | null
  reach: number | null
  impressions: number | null
  link_clicks: number | null
  leads: number | null
  spend: number | null
  notes: string | null
}

function dayX(startDate: string) {
  return Math.max(1, Math.min(Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) + 1, 14))
}

export default function SprintDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [showLogForm, setShowLogForm] = useState(false)
  const [logForm, setLogForm] = useState<Omit<DailyLog, 'id' | 'log_date' | 'day_number' | 'sprint_id'>>({
    reach: 0,
    impressions: 0,
    link_clicks: 0,
    leads: 0,
    spend: 0,
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    if (!id) return
    const [s, l] = await Promise.all([
      supabase.from('proof_sprints').select('*').eq('id', id).single(),
      supabase.from('sprint_daily_log').select('*').eq('sprint_id', id).order('log_date')
    ])

    if (s.data) {
      setSprint({
        ...s.data,
        client_name: s.data.client_name ?? 'Unknown Client',
        vertical: s.data.vertical ?? '',
        client_ad_budget: s.data.client_ad_budget ?? 0,
        actual_ad_spend: s.data.actual_ad_spend ?? 0,
        leads_generated: s.data.leads_generated ?? 0,
        revenue_attributed: s.data.revenue_attributed ?? 0,
        bookings_from_sprint: s.data.bookings_from_sprint ?? 0,
        day7_notes: s.data.day7_notes ?? '',
        day7_sentiment: s.data.day7_sentiment ?? '',
        talking_points: s.data.talking_points ?? '',
        // cpl and roas come directly from DB — no override needed
        cpl: null,
        roas: null,
      })
    }

    if (l.data) {
      const normalizedLogs = l.data.map(log => ({
        ...log,
        day_number: log.day_number ?? dayX(log.log_date || new Date().toISOString()),
        reach: log.reach ?? 0,
        impressions: log.impressions ?? 0,
        link_clicks: log.link_clicks ?? 0,
        leads: log.leads ?? 0,
        spend: log.spend ?? 0,
        notes: log.notes ?? ''
      }))
      setLogs(normalizedLogs)
    }
  }

  async function addLog() {
    if (!id || !sprint) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const dayNum = dayX(sprint.start_date)

    const { error } = await supabase
      .from('sprint_daily_log')
      .upsert(
        { sprint_id: id, log_date: today, day_number: dayNum, ...logForm },
        { onConflict: 'sprint_id,log_date' }
      )

    if (error) {
      toast('Failed to save log', 'error')
      setSaving(false)
      return
    }

    // Update sprint totals — use ?? 0 to satisfy TS
    const totalSpend = logs.reduce((sum, l) => sum + (l.spend ?? 0), 0) + (logForm.spend ?? 0)
    const totalLeads = logs.reduce((sum, l) => sum + (l.leads ?? 0), 0) + (logForm.leads ?? 0)
    const newCpl = totalLeads > 0 ? totalSpend / totalLeads : 0

    await supabase
      .from('proof_sprints')
      .update({ actual_ad_spend: totalSpend, leads_generated: totalLeads, cpl: newCpl })
      .eq('id', id)

    toast('Daily log saved ✓')
    setSaving(false)
    setShowLogForm(false)
    setLogForm({ reach: 0, impressions: 0, link_clicks: 0, leads: 0, spend: 0, notes: '' })
    load()
  }

  async function saveDay7(field: 'day7_notes' | 'day7_sentiment', value: string) {
    if (!id || !sprint) return
    await supabase.from('proof_sprints').update({ [field]: value }).eq('id', id)
    setSprint(prev => prev ? { ...prev, [field]: value } : prev)
  }

  if (!sprint) return <div style={{ padding: 40, color: 'var(--grey)', fontFamily: 'DM Mono' }}>Loading sprint...</div>

  const day = dayX(sprint.start_date)
  const totalSpend = logs.reduce((sum, l) => sum + (l.spend ?? 0), 0)
  const totalLeads = logs.reduce((sum, l) => sum + (l.leads ?? 0), 0)
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0
  const budgetRemaining = (sprint.client_ad_budget ?? 0) - totalSpend
  const cplColor = cpl === 0 ? 'var(--grey)' : cpl < 150 ? 'var(--green)' : cpl < 300 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{ maxWidth: 900 }}>
      <button
        onClick={() => navigate('/delivery/sprints')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--grey)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'DM Mono',
          fontSize: 12,
          marginBottom: 20
        }}
      >
        <ChevronLeft size={14} /> Back to Sprints
      </button>

      {/* Sprint Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 700 }}>{sprint.client_name || 'Sprint Detail'}</div>
          {sprint.vertical && (
            <div style={{ color: 'var(--grey)', fontSize: 14, marginTop: 4 }}>
              {sprint.vertical} · started {formatDate(sprint.start_date)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 28, fontWeight: 500, color: 'var(--teal)' }}>
            Day {day}<span style={{ fontSize: 16, color: 'var(--grey2)' }}>/14</span>
          </div>
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {14 - day} days remaining
          </div>
        </div>
      </div>

      {/* Ad Performance */}
      <div className="stats-grid-5" style={{ marginBottom: 24 }}>
        {[
          { label: 'Ad Spend', value: formatRand(totalSpend) },
          { label: 'Budget Left', value: formatRand(budgetRemaining) },
          { label: 'Leads', value: totalLeads },
          { label: 'CPL', value: cpl > 0 ? formatRand(cpl) : '—', color: cplColor },
          { label: 'ROAS', value: sprint.roas != null ? `${sprint.roas}×` : '—' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
            <div className="label">{s.label}</div>
            <div className="stat-num" style={{ fontSize: 22, marginTop: 6, color: s.color || 'var(--teal)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Daily Log */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="section-label" style={{ margin: 0 }}>Daily Log</div>
          <button className="btn-primary" onClick={() => setShowLogForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
            <Plus size={12} /> Add Today's Log
          </button>
        </div>

        {showLogForm && (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: 16, marginBottom: 16 }}>
            <div className="stats-grid-5" style={{ marginBottom: 10 }}>
              {[
                { label: 'Reach', field: 'reach' },
                { label: 'Impressions', field: 'impressions' },
                { label: 'Clicks', field: 'link_clicks' },
                { label: 'Leads', field: 'leads' },
                { label: 'Spend (R)', field: 'spend' },
              ].map(f => (
                <div key={f.field}>
                  <div className="label">{f.label}</div>
                  <input
                    className="input"
                    type="number"
                    value={logForm[f.field as keyof typeof logForm] ?? 0}
                    onChange={e => setLogForm(prev => ({ ...prev, [f.field]: Number(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="label">Notes</div>
              <input
                className="input"
                placeholder="Observations, optimisations made, notable events..."
                value={logForm.notes ?? ''}
                onChange={e => setLogForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <button className="btn-primary" onClick={addLog} disabled={saving}>
              {saving ? 'Saving...' : 'Save Log Entry →'}
            </button>
          </div>
        )}

        {logs.length === 0 ? (
          <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            No log entries yet. Add today's data above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="aa-table">
              <thead>
                <tr>
                  <th>Day</th><th>Date</th><th>Reach</th><th>Clicks</th><th>Leads</th><th>Spend</th><th>CPL</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontFamily: 'DM Mono', color: 'var(--teal)' }}>Day {l.day_number ?? '?'}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{formatDate(l.log_date)}</td>
                    <td>{(l.reach ?? 0).toLocaleString()}</td>
                    <td>{l.link_clicks ?? 0}</td>
                    <td style={{ color: 'var(--teal)', fontFamily: 'DM Mono' }}>{l.leads ?? 0}</td>
                    <td>{formatRand(l.spend ?? 0)}</td>
                    <td style={{ fontFamily: 'DM Mono', color: cplColor }}>
                      {l.leads && l.leads > 0 ? formatRand((l.spend ?? 0) / l.leads) : '—'}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{l.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Day 7 Check-in */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-label">Day 7 Check-in</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div>
            <div className="label">Notes from Day 7 call</div>
            <textarea
              className="input"
              rows={3}
              placeholder="Client feedback, questions raised, sentiment notes..."
              defaultValue={sprint.day7_notes ?? ''}
              onBlur={e => saveDay7('day7_notes', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div>
            <div className="label">Client Sentiment</div>
            <select
              className="input"
              value={sprint.day7_sentiment ?? ''}
              onChange={e => saveDay7('day7_sentiment', e.target.value)}
            >
              <option value="">Not recorded</option>
              <option value="satisfied">Satisfied</option>
              <option value="neutral">Neutral</option>
              <option value="concerned">Concerned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Meeting Prep */}
      <div className="card">
        <div className="section-label">Results Meeting Prep</div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: 14, marginBottom: 14, fontSize: 13, color: 'var(--grey)', lineHeight: 1.8 }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Auto-populated from sprint data</div>
          <div>Ad spend: <span style={{ color: 'var(--white)' }}>{formatRand(totalSpend)}</span></div>
          <div>Leads generated: <span style={{ color: 'var(--white)' }}>{totalLeads}</span></div>
          <div>CPL: <span style={{ color: cplColor }}>{cpl > 0 ? formatRand(cpl) : '—'}</span></div>
          <div>Days run: <span style={{ color: 'var(--white)' }}>{day} of 14</span></div>
          <div>Client sentiment (Day 7): <span style={{ color: 'var(--white)' }}>{sprint.day7_sentiment || 'Not recorded'}</span></div>
        </div>
        <div>
          <div className="label">Editable Talking Points</div>
          <textarea
            className="input"
            rows={5}
            placeholder="1. Lead with the numbers&#10;2. Frame the CPL against industry average&#10;3. Show what full system capacity looks like&#10;4. Present the Proof Brand investment&#10;5. Close with the guarantee"
            defaultValue={sprint.talking_points ?? ''}
            onBlur={async e => {
              if (!id) return
              await supabase.from('proof_sprints').update({ talking_points: e.target.value }).eq('id', id)
            }}
            style={{ resize: 'vertical', fontFamily: 'DM Mono', fontSize: 12 }}
          />
        </div>
        <GenerateReportButton sprintId={id!} sprint={sprint} logs={logs} />
      </div>
    </div>
  )
}

function GenerateReportButton({ sprintId, sprint, logs }: { sprintId: string; sprint: Sprint; logs: DailyLog[] }) {
  const [report, setReport] = useState('')
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  async function generate() {
    setGenerating(true)
    setReport('')
    try {
      const { data, error } = await supabase.functions.invoke('generate-sprint-report', {
        body: { sprint, logs }
      })
      if (error) throw error
      setReport(data.report)
      await supabase.from('proof_sprints').update({ talking_points: data.report }).eq('id', sprintId)
      toast('Results report generated ✓')
    } catch {
      toast('Generation failed — check Supabase Edge Functions', 'error')
    }
    setGenerating(false)
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        className="btn-primary"
        onClick={generate}
        disabled={generating}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {generating ? 'Generating...' : '✦ Generate Results Report →'}
      </button>
      {report && (
        <div style={{ marginTop: 16, background: 'var(--bg3)', border: '1px solid var(--teal-border)', borderRadius: 6, padding: 18, fontSize: 13, color: 'var(--white)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
          {report}
        </div>
      )}
    </div>
  )
}