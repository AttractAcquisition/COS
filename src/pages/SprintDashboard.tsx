import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, Gauge, Layers3, LineChart, Loader2, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { formatDate, formatRand } from '../lib/utils'

const ACTIVE_STATUSES = new Set(['active', 'in_progress', 'running', 'live', 'ongoing'])

type SprintRow = {
  id: string
  sprint_number: number | null
  client_id: string | null
  client_name: string | null
  status: string | null
  start_date: string
  actual_ad_spend: number | null
  client_ad_budget: number | null
  leads_generated: number | null
  bookings_from_sprint: number | null
  revenue_attributed: number | null
  total_reach: number | null
  total_impressions: number | null
  link_clicks: number | null
  results_meeting_date: string | null
  results_meeting_outcome: string | null
  day7_sentiment: string | null
  day7_notes: string | null
  talking_points: string | null
  close_notes: string | null
  vertical: string | null
}

type DailyLog = {
  id: string
  log_date: string
  day_number: number | null
  spend: number | null
  reach: number | null
  impressions: number | null
  leads: number | null
  link_clicks: number | null
  notes: string | null
}

export default function SprintDashboard() {
  const { metadata_id } = useAuth()
  const [client, setClient] = useState<any | null>(null)
  const [sprints, setSprints] = useState<SprintRow[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const db = supabase as any

  const selectedSprint = useMemo(() => {
    return sprints.find(s => ACTIVE_STATUSES.has((s.status || '').toLowerCase())) || sprints[0] || null
  }, [sprints])

  useEffect(() => {
    if (metadata_id) load()
    else setLoading(false)
  }, [metadata_id])

  async function load() {
    if (!metadata_id) return
    setLoading(true)

    const [clientRes, sprintRes] = await Promise.all([
      db.from('clients').select('id, business_name, owner_name, account_manager_name, monthly_ad_spend, tier, status').eq('id', metadata_id).maybeSingle(),
      db.from('proof_sprints').select('id, sprint_number, client_id, client_name, status, start_date, actual_ad_spend, client_ad_budget, leads_generated, bookings_from_sprint, revenue_attributed, total_reach, total_impressions, link_clicks, results_meeting_date, results_meeting_outcome, day7_sentiment, day7_notes, talking_points, close_notes, vertical').eq('client_id', metadata_id).order('created_at', { ascending: false }),
    ])

    const sprintRows = (sprintRes.data || []) as SprintRow[]
    const sprint = sprintRows.find(s => ACTIVE_STATUSES.has((s.status || '').toLowerCase())) || sprintRows[0] || null

    let logRows: DailyLog[] = []
    if (sprint?.id) {
      const { data: logRes } = await db
        .from('sprint_daily_log')
        .select('id, log_date, day_number, spend, reach, impressions, leads, link_clicks, notes')
        .eq('sprint_id', sprint.id)
        .order('log_date', { ascending: false })
      logRows = (logRes || []) as DailyLog[]
    }

    setClient(clientRes.data || null)
    setSprints(sprintRows)
    setLogs(logRows)
    setLoading(false)
  }

  const totals = useMemo(() => {
    const spend = logs.reduce((sum, row) => sum + (row.spend || 0), 0) || selectedSprint?.actual_ad_spend || selectedSprint?.client_ad_budget || client?.monthly_ad_spend || 0
    const reach = logs.reduce((sum, row) => sum + (row.reach || 0), 0) || selectedSprint?.total_reach || 0
    const impressions = logs.reduce((sum, row) => sum + (row.impressions || 0), 0) || selectedSprint?.total_impressions || 0
    const leads = logs.reduce((sum, row) => sum + (row.leads || 0), 0) || selectedSprint?.leads_generated || 0
    const linkClicks = logs.reduce((sum, row) => sum + (row.link_clicks || 0), 0) || selectedSprint?.link_clicks || 0
    const bookings = selectedSprint?.bookings_from_sprint || 0
    const revenue = selectedSprint?.revenue_attributed || 0
    const roas = spend > 0 ? revenue / spend : 0
    const leadToBooking = leads > 0 ? bookings / leads : 0

    return { spend, reach, impressions, leads, linkClicks, bookings, revenue, roas, leadToBooking }
  }, [logs, selectedSprint, client])

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)', fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.12em' }}>
        <Loader2 size={16} className="spin" style={{ marginRight: 10 }} />
        LOADING SPRINT DASHBOARD...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 56 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="AA" style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>
              Client Portal
            </div>
            <h1 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 34, lineHeight: 1.1, color: 'var(--white)' }}>
              Sprint Dashboard
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--grey)', fontSize: 14, maxWidth: 780 }}>
              {client?.business_name ? `${client.business_name} sprint performance and results.` : 'Sprint performance and results.'}
            </p>
          </div>
        </div>

        <Link
          to="/portal"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border2)', background: 'var(--bg2)',
            color: 'var(--grey)', textDecoration: 'none',
            fontFamily: 'DM Mono', fontSize: 10, textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <ArrowLeft size={12} /> Back
        </Link>
      </header>

      {!selectedSprint ? (
        <div style={{ padding: 24, border: '1px dashed var(--border2)', borderRadius: 12, color: 'var(--grey)' }}>
          No sprint data found for this client yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <StatCard icon={Layers3} label="Sprint" value={`#${selectedSprint.sprint_number || '—'}`} />
            <StatCard icon={CheckCircle2} label="Status" value={(selectedSprint.status || '—').replace('_', ' ')} />
            <StatCard icon={Gauge} label="Spend" value={formatRand(totals.spend)} />
            <StatCard icon={Target} label="Revenue" value={formatRand(totals.revenue)} />
            <StatCard icon={LineChart} label="ROAS" value={totals.roas ? `${totals.roas.toFixed(1)}x` : '—'} />
            <StatCard icon={Clock3} label="Bookings" value={String(totals.bookings)} />
          </section>

          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <InfoCard label="Client" value={selectedSprint.client_name || client?.business_name || '—'} />
            <InfoCard label="Owner" value={client?.owner_name || '—'} />
            <InfoCard label="Account Manager" value={client?.account_manager_name || '—'} />
            <InfoCard label="Start Date" value={formatDate(selectedSprint.start_date)} />
            <InfoCard label="Results Meeting" value={formatDate(selectedSprint.results_meeting_date)} />
            <InfoCard label="Lead → Booking" value={totals.leadToBooking ? `${(totals.leadToBooking * 100).toFixed(1)}%` : '—'} />
          </section>

          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <MiniMetric label="Reach" value={totals.reach.toLocaleString('en-ZA')} />
            <MiniMetric label="Impressions" value={totals.impressions.toLocaleString('en-ZA')} />
            <MiniMetric label="Leads" value={totals.leads.toLocaleString('en-ZA')} />
            <MiniMetric label="Link Clicks" value={totals.linkClicks.toLocaleString('en-ZA')} />
          </section>

          <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 18 }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 12 }}>
                Sprint Notes
              </div>
              <div style={{ display: 'grid', gap: 12, fontSize: 13, lineHeight: 1.7, color: 'var(--grey)' }}>
                <NoteRow label="Day 7 sentiment" value={selectedSprint.day7_sentiment || '—'} />
                <NoteRow label="Day 7 notes" value={selectedSprint.day7_notes || '—'} />
                <NoteRow label="Talking points" value={selectedSprint.talking_points || '—'} />
                <NoteRow label="Close notes" value={selectedSprint.close_notes || '—'} />
                <NoteRow label="Results meeting outcome" value={selectedSprint.results_meeting_outcome || '—'} />
              </div>
            </div>

            <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 18 }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 12 }}>
                What This Sprint Is Tracking
              </div>
              <div style={{ display: 'grid', gap: 10, color: 'var(--grey)', fontSize: 13, lineHeight: 1.6 }}>
                <div>• Ad spend against the current sprint budget</div>
                <div>• Reach, impressions, and click volume</div>
                <div>• Lead generation and booking conversion</div>
                <div>• Revenue attributed to the sprint</div>
                <div>• Day-by-day notes from the account manager</div>
              </div>
            </div>
          </section>

          <section style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 18 }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 12 }}>
              Daily Sprint Log
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: 18, color: 'var(--grey)', fontSize: 13, border: '1px dashed var(--border2)', borderRadius: 10 }}>
                No daily logs entered yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, overflowX: 'auto' }}>
                {logs.map(row => (
                  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '140px repeat(5, minmax(80px, 1fr))', gap: 10, alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg)', minWidth: 520 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>{formatDate(row.log_date)}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 3 }}>
                        Day {row.day_number || '—'}
                      </div>
                    </div>
                    <MiniMetric label="Spend" value={formatRand(row.spend)} />
                    <MiniMetric label="Reach" value={(row.reach || 0).toLocaleString('en-ZA')} />
                    <MiniMetric label="Impr." value={(row.impressions || 0).toLocaleString('en-ZA')} />
                    <MiniMetric label="Leads" value={(row.leads || 0).toLocaleString('en-ZA')} />
                    <MiniMetric label="Clicks" value={(row.link_clicks || 0).toLocaleString('en-ZA')} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 18 }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 12 }}>
              Sprint History
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {sprints.map(row => (
                <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border2)', borderRadius: 10, background: row.id === selectedSprint.id ? 'rgba(0,201,167,0.06)' : 'var(--bg)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>Sprint #{row.sprint_number || '—'} · {(row.status || '—').replace('_', ' ')}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>{formatDate(row.start_date)} · {row.vertical || 'General'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 18, color: 'var(--grey)', fontSize: 11, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>
                    <span>{formatRand(row.revenue_attributed)}</span>
                    <span>{formatRand(row.actual_ad_spend)}</span>
                    <span>{row.bookings_from_sprint || 0} bookings</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(0, 201, 167, 0.08)' }}>
        <Icon size={16} color="var(--teal)" />
      </div>
      <div>
        <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--white)', marginTop: 4 }}>{value}</div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 16px', border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)' }}>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--white)' }}>{value}</div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '12px 14px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg)' }}>
      <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--white)', marginTop: 6 }}>{value}</div>
    </div>
  )
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)' }}>{label}</div>
      <div style={{ marginTop: 4, color: 'var(--white)' }}>{value}</div>
    </div>
  )
}
