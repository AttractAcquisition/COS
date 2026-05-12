import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock3, Gauge, Loader2, MessageSquareText, Target, Users, UserRoundSearch } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { formatDate, formatRand } from '../lib/utils'

type ClientRow = {
  id: string
  business_name: string
  owner_name: string
  monthly_ad_spend: number | null
  account_manager_name: string | null
}

type DeliveryMetricRow = {
  id: string
  date_key: string | null
  profile_visits: number | null
  dms_started: number | null
  qualified_followers: number | null
  appointments_booked: number | null
  cash_collected: number | null
  notes: string | null
  updated_at: string | null
}

type SprintRow = {
  id: string
  status: string | null
  actual_ad_spend: number | null
  client_ad_budget: number | null
}

export default function LivePipelineDashboard() {
  const { metadata_id } = useAuth()
  const [client, setClient] = useState<ClientRow | null>(null)
  const [metrics, setMetrics] = useState<DeliveryMetricRow[]>([])
  const [latestSprint, setLatestSprint] = useState<SprintRow | null>(null)
  const [loading, setLoading] = useState(true)
  const db = supabase as any

  useEffect(() => {
    if (metadata_id) load()
    else setLoading(false)
  }, [metadata_id])

  async function load() {
    if (!metadata_id) return
    setLoading(true)

    const [clientRes, metricsRes, sprintRes] = await Promise.all([
      db.from('clients').select('id, business_name, owner_name, monthly_ad_spend, account_manager_name').eq('id', metadata_id).maybeSingle(),
      db.from('delivery_metrics').select('id, date_key, profile_visits, dms_started, qualified_followers, appointments_booked, cash_collected, notes, updated_at').eq('client_id', metadata_id).order('date_key', { ascending: false }).limit(30),
      db.from('proof_sprints').select('id, status, actual_ad_spend, client_ad_budget').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    setClient((clientRes.data || null) as ClientRow | null)
    setMetrics((metricsRes.data || []) as DeliveryMetricRow[])
    setLatestSprint((sprintRes.data || null) as SprintRow | null)
    setLoading(false)
  }

  const totals = useMemo(() => {
    const profileVisits = metrics.reduce((sum, row) => sum + (row.profile_visits || 0), 0)
    const dmsStarted = metrics.reduce((sum, row) => sum + (row.dms_started || 0), 0)
    const qualifiedFollowers = metrics.reduce((sum, row) => sum + (row.qualified_followers || 0), 0)
    const bookedCalls = metrics.reduce((sum, row) => sum + (row.appointments_booked || 0), 0)
    const cashCollected = metrics.reduce((sum, row) => sum + (row.cash_collected || 0), 0)
    const adSpend = latestSprint?.actual_ad_spend ?? latestSprint?.client_ad_budget ?? client?.monthly_ad_spend ?? 0
    const returnOnSpend = adSpend > 0 ? cashCollected / adSpend : 0
    const qualToBooked = qualifiedFollowers > 0 ? bookedCalls / qualifiedFollowers : 0
    const visitToDM = profileVisits > 0 ? dmsStarted / profileVisits : 0

    return { profileVisits, dmsStarted, qualifiedFollowers, bookedCalls, cashCollected, adSpend, returnOnSpend, qualToBooked, visitToDM }
  }, [metrics, latestSprint, client])

  const latest = metrics[0] || null

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)', fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.12em' }}>
        <Loader2 size={16} className="spin" style={{ marginRight: 10 }} />
        LOADING LIVE PIPELINE...
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
              Live Pipeline Dashboard
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--grey)', fontSize: 14, maxWidth: 780 }}>
              {client?.business_name ? `${client.business_name} pipeline performance and return.` : 'Pipeline performance and return.'}
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

      {!client ? (
        <div style={{ padding: 24, border: '1px dashed var(--border2)', borderRadius: 12, color: 'var(--grey)' }}>
          No client record found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <StatCard icon={Users} label="Followers / Visits" value={totals.profileVisits.toLocaleString('en-ZA')} />
            <StatCard icon={MessageSquareText} label="DMs Started" value={totals.dmsStarted.toLocaleString('en-ZA')} />
            <StatCard icon={UserRoundSearch} label="Qualified Followers" value={totals.qualifiedFollowers.toLocaleString('en-ZA')} />
            <StatCard icon={Clock3} label="Booked Calls" value={totals.bookedCalls.toLocaleString('en-ZA')} />
            <StatCard icon={Target} label="Cash Collected" value={formatRand(totals.cashCollected)} />
            <StatCard icon={Gauge} label="Ad Spend" value={formatRand(totals.adSpend)} />
          </section>

          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <InfoCard label="Client" value={client.business_name} />
            <InfoCard label="Owner" value={client.owner_name} />
            <InfoCard label="Account Manager" value={client.account_manager_name || '—'} />
            <InfoCard label="Latest Update" value={formatDate(latest?.date_key)} />
            <InfoCard label="Return on Spend" value={totals.returnOnSpend ? `${totals.returnOnSpend.toFixed(1)}x` : '—'} />
            <InfoCard label="Qualified → Booked" value={totals.qualToBooked ? `${(totals.qualToBooked * 100).toFixed(1)}%` : '—'} />
          </section>

          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <MiniMetric label="Visit → DM" value={totals.visitToDM ? `${(totals.visitToDM * 100).toFixed(1)}%` : '—'} />
            <MiniMetric label="Cash / Client" value={formatRand(totals.cashCollected)} />
            <MiniMetric label="Current Sprint Spend" value={formatRand(latestSprint?.actual_ad_spend ?? latestSprint?.client_ad_budget)} />
            <MiniMetric label="Period Updates" value={`${metrics.length} rows`} />
          </section>

          <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 18 }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 12 }}>
                Live Pipeline Notes
              </div>
              <div style={{ display: 'grid', gap: 10, color: 'var(--grey)', fontSize: 13, lineHeight: 1.6 }}>
                <div>• Profile visits are the top-of-funnel attention signal.</div>
                <div>• DMs started and qualified followers measure intent.</div>
                <div>• Booked calls show the pipeline turning into real sales conversations.</div>
                <div>• Cash collected is the return the client actually receives.</div>
                <div>• Spend is compared against the latest sprint or ad budget reference.</div>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 18 }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 12 }}>
                Latest Snapshot
              </div>
              {latest ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <SnapshotRow label="Date" value={formatDate(latest.date_key)} />
                  <SnapshotRow label="Profile Visits" value={(latest.profile_visits || 0).toLocaleString('en-ZA')} />
                  <SnapshotRow label="DMs Started" value={(latest.dms_started || 0).toLocaleString('en-ZA')} />
                  <SnapshotRow label="Qualified Followers" value={(latest.qualified_followers || 0).toLocaleString('en-ZA')} />
                  <SnapshotRow label="Booked Calls" value={(latest.appointments_booked || 0).toLocaleString('en-ZA')} />
                  <SnapshotRow label="Cash Collected" value={formatRand(latest.cash_collected)} />
                  {latest.notes && <SnapshotRow label="Notes" value={latest.notes} />}
                </div>
              ) : (
                <div style={{ color: 'var(--grey)' }}>No pipeline rows entered yet.</div>
              )}
            </div>
          </section>

          <section style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 18 }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 12 }}>
              Recent Pipeline Entries
            </div>
            {metrics.length === 0 ? (
              <div style={{ padding: 18, color: 'var(--grey)', fontSize: 13, border: '1px dashed var(--border2)', borderRadius: 10 }}>
                No pipeline data entered yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, overflowX: 'auto' }}>
                {metrics.map(row => (
                  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '140px repeat(5, minmax(80px, 1fr))', gap: 10, alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg)', minWidth: 520 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>{formatDate(row.date_key)}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 3 }}>
                        Updated {formatDate(row.updated_at)}
                      </div>
                    </div>
                    <MiniMetric label="Visits" value={(row.profile_visits || 0).toLocaleString('en-ZA')} />
                    <MiniMetric label="DMs" value={(row.dms_started || 0).toLocaleString('en-ZA')} />
                    <MiniMetric label="Qualified" value={(row.qualified_followers || 0).toLocaleString('en-ZA')} />
                    <MiniMetric label="Booked" value={(row.appointments_booked || 0).toLocaleString('en-ZA')} />
                    <MiniMetric label="Cash" value={formatRand(row.cash_collected)} />
                  </div>
                ))}
              </div>
            )}
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

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 12px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg)' }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--white)', textAlign: 'right' }}>{value}</div>
    </div>
  )
}
