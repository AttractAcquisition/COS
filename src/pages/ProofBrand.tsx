import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Loader2, Gift, ExternalLink } from 'lucide-react'
import { useToast } from '../lib/toast'

const TIER_NAME = 'Proof Brand'

// ─── Step & Bonus Type Definitions ────────────────────────────────────────────

interface StepDef {
  id: number
  title: string
  value: string
  solves: string
  description: string
  tools: string[]
  items: string[]
}

interface BonusDef {
  id: string
  stepId: number   // stepId 11–14 for bonuses
  title: string
  value: string
  description: string
  items: string[]
}

// ─── DB Position Encoding ──────────────────────────────────────────────────────
// Step items:  step.id * 1000 + item_index  (0–998)
// Step notes:  step.id * 1000 + 999
// Bonus items: bonus.stepId * 1000 + item_index  (stepId 11–14)
// New-format rows always have position >= 1000

// ─── Proof Brand Step Definitions ─────────────────────────────────────────────
export const PROOF_BRAND_STEPS: StepDef[] = [
  {
    id: 1,
    title: 'Onboard & Audit',
    value: 'R4,500',
    solves: 'Starting without clarity → wasted build time and misdirected spend',
    description:
      'The Proof Brand starts by locking in the client’s business, sector, target market, conversion objective, current infrastructure, access credentials, assets, average job value, offer, and brand voice. This prevents the entire build from being based on assumptions. Every decision after this point is specific to the business, the city, the buyer, and the proof needed to create demand.',
    tools: ['AA Client Dashboard', 'Onboarding Brief', 'Infrastructure Audit'],
    items: [
      'AA Client Dashboard account created and client invited',
      'Onboarding call completed with client',
      'Onboarding Brief completed in full',
      'All existing assets collected and organised',
      'All required access credentials collected: Meta, Instagram, WhatsApp, website, domain, tracking, and booking tools',
      'Sector, service category, and local market documented',
      'Target client profile documented',
      'Average job value confirmed',
      'Core offer and conversion objective confirmed',
      'Brand voice, tone, and positioning inputs documented',
      'Current Instagram, Meta, WhatsApp, website, and funnel infrastructure audited',
      'Infrastructure gaps documented before build begins',
    ],
  },
  {
    id: 2,
    title: 'Build the Client Command Centre',
    value: 'R3,500',
    solves: 'Having no visibility into what the marketing is actually producing',
    description:
      'The AA Client Dashboard becomes the central operating system for the Proof Brand. It gives the client one place to track approvals, assets, campaign status, pipeline movement, daily updates, and revenue activity. Before traffic is generated, the reporting and visibility system is installed so the client can see what the engine is producing from Day 1.',
    tools: ['AA Portal', 'AA Client Dashboard', 'Daily AM Updates', 'Meta Ads Integration'],
    items: [
      'Client dashboard workspace configured',
      'Client portal access granted and login confirmed',
      'Approval flow created for content, ads, landing page, and launch assets',
      'Campaign status tracker configured',
      'Pipeline dashboard configured for client',
      'All 5 pipeline stages created: Profile Visits → DMs Started → Qualified Leads → Appointments Booked → Cash Collected',
      'Daily AM update structure created',
      'Meta Ads integration prepared',
      'First test pipeline entry logged by account manager',
      'Client shown where all assets, approvals, and campaign updates will live',
    ],
  },
  {
    id: 3,
    title: 'Rebuild the Profile for Conversion',
    value: 'R2,500',
    solves: 'Profile visitors leaving because the brand looks unclear, weak, or untrustworthy',
    description:
      'The Instagram profile is rebuilt into a conversion asset before any serious traffic is sent to it. The bio, highlights, pinned posts, and link-in-bio pathway are structured to make the business immediately understandable, credible, and easy to contact. The profile becomes the trust layer that supports every ad, post, and DM conversation that follows.',
    tools: ['Instagram', 'AA Studio', 'Link-in-Bio Page', 'AA Client Dashboard'],
    items: [
      'Current Instagram profile reviewed',
      'Profile positioning angle confirmed',
      'Bio rewritten with clear conversion intent',
      'Profile CTA updated to match the conversion objective',
      'Highlights structure created',
      'Highlights populated or prepared for client assets',
      'Pinned post strategy created',
      'Link-in-bio page built and connected',
      'Profile checked for trust, clarity, and conversion readiness',
      'Profile rebuild approved by client',
    ],
  },
  {
    id: 4,
    title: 'Build the Conversion Infrastructure',
    value: 'R6,000',
    solves: 'Traffic arriving with nowhere to go and no clear reason to act',
    description:
      'The conversion infrastructure is built around the client’s chosen conversion objective: WhatsApp enquiries, form submissions, direct DMs, or booking requests. The landing page, WhatsApp Business setup, CTA pathway, tracking, and A/B test structure are installed so every visitor has a clear next step and every campaign has somewhere measurable to send demand.',
    tools: ['Lovable Landing Page', 'WhatsApp Business', 'AA Client Dashboard', 'Meta Pixel'],
    items: [
      'Final conversion objective confirmed: WhatsApp, form, DM, or booking pathway',
      'Primary CTA pathway mapped',
      'Landing page structure planned',
      'Landing page copy written using brand, proof, offer, and buyer psychology',
      'Landing page copy approved by client',
      'Landing page built on Lovable',
      'Landing page connected to correct CTA destination',
      'WhatsApp Business profile configured or optimised',
      'Tracking pixels installed',
      'Conversion tracking tested and verified',
      'A/B test variant 1 created',
      'A/B test variant 2 created',
      'Conversion infrastructure confirmed live',
    ],
  },
  {
    id: 5,
    title: 'Install the DM-to-Booking Flow',
    value: 'R4,000',
    solves: 'Enquiries that die in the DMs and never become booked appointments',
    description:
      'The enquiry handling system is installed before campaigns go live. Every inbound message is handled through a clear flow: qualify the lead, identify seriousness, guide the conversation, book the appointment, confirm the appointment, and follow up before the scheduled time. This prevents paid demand from being wasted inside unmanaged DMs.',
    tools: ['WhatsApp Business', 'DM Script Framework', 'AA Client Dashboard'],
    items: [
      'Existing DM and WhatsApp enquiry handling reviewed',
      'Lead qualification criteria confirmed',
      'DM qualifier sequence written',
      'Serious-lead filter questions documented',
      'Appointment booking message scripted',
      'Booking confirmation message written',
      'Day-before show-up follow-up written',
      'Basic objection-handling responses written',
      'Full DM-to-booking flow added to client dashboard',
      'Client briefed on how the DM flow works before launch',
      'Client confirms the DM process is understood before traffic goes live',
    ],
  },
  {
    id: 6,
    title: 'Build the Proof Foundation',
    value: 'R3,000',
    solves: 'Running ads to an empty, inconsistent, or low-trust brand presence',
    description:
      'The first six proof posts are created before the engine goes live. These posts establish credibility on the profile so that cold and warm prospects can quickly see the business does quality work. This becomes the trust foundation that supports paid traffic, organic profile visits, retargeting, and sales conversations.',
    tools: ['AA Studio', 'Instagram', 'AA Portal Approval Flow'],
    items: [
      'Available job documentation, testimonials, process footage, and proof assets reviewed',
      'Six proof content angles selected',
      'Post 1 — Job documentation / result: created and captioned',
      'Post 2 — Job documentation / result: created and captioned',
      'Post 3 — Process / behind-the-scenes: created and captioned',
      'Post 4 — Proof / testimonial: created and captioned',
      'Post 5 — Authority / expertise: created and captioned',
      'Post 6 — Brand intro / credibility: created and captioned',
      'All six proof posts uploaded for client review',
      'All six proof posts approved by client',
      'All six proof posts published or scheduled to profile',
      'Profile confirmed ready to receive traffic',
    ],
  },
  {
    id: 7,
    title: 'Create the Sector Ad Script Pack',
    value: 'R3,500',
    solves: 'Generic ad messaging that fails to speak to the specific buyer’s fears, desires, and decision-making triggers',
    description:
      'A sector-specific ad script pack is created before campaign assets are built. The pack gives the client a library of hooks, scripts, CTAs, proof angles, and objection-led messaging that can be used across attraction, nurture, and conversion campaigns. This ensures campaign creative is built from buyer psychology, not random content ideas.',
    tools: ['AA Studio', 'Master Ad Script Pack', 'AA Client Dashboard'],
    items: [
      'Client sector and buyer psychology reviewed',
      'Primary buyer fears documented',
      'Primary buyer desires documented',
      'Primary objections documented',
      'Primary proof triggers documented',
      'Minimum 10 sector-specific hooks written',
      'Minimum 5 ad scripts written',
      'CTA frameworks documented',
      'Proof-led ad angles written',
      'Objection-led ad angles written',
      'Script pack filed inside AA Portal',
      'Script pack approved for campaign production',
    ],
  },
  {
    id: 8,
    title: 'Build the Funnel Strategy Documents',
    value: 'R16,500',
    solves: 'Disconnected content and ads with no sequenced funnel logic',
    description:
      'The three core positioning documents are created for the full Proof Brand funnel: Attraction, Nurture, and Conversion. Attraction builds awareness and trust with cold audiences. Nurture compounds familiarity with people who have already engaged. Conversion moves warm prospects from interest to action. Together, these documents define what is said, who it is said to, why it matters, and how each stage moves the buyer closer to booking.',
    tools: ['AA Studio', 'AA Client Dashboard', 'Meta Ads Manager', 'Meta Retargeting'],
    items: [
      'Attraction Positioning Document created',
      'Top-of-funnel content strategy defined',
      'Cold audience trust-building angle documented',
      'Job documentation, process footage, result proof, and quality proof angles mapped',
      'First batch of attraction content produced in AA Studio',
      'Attraction creative variant 1 built',
      'Attraction creative variant 2 built',
      'Attraction document filed for client approval',

      'Nurture Positioning Document created',
      'Middle-of-funnel content strategy defined',
      'Warm audience retargeting logic documented',
      'Trust-compounding content angles mapped',
      'Warm audience retargeting pools planned',
      'Nurture creative variant 1 built',
      'Nurture creative variant 2 built',
      'Nurture document filed for client approval',

      'Conversion Positioning Document created',
      'Bottom-of-funnel conversion strategy defined',
      'Primary client objection documented',
      'Primary hesitation documented',
      'Key proof point that converts identified and written',
      'Conversion ad copy written',
      'Conversion creative variant 1 built',
      'Conversion creative variant 2 built',
      'Conversion document filed for client approval',

      'All three positioning documents reviewed internally',
      'All three positioning documents sent to client for approval',
      'All three positioning documents approved by client',
    ],
  },
  {
    id: 9,
    title: 'Build and Launch the Meta Ad Engine',
    value: 'R10,500',
    solves: 'Launching campaigns before the client understands the system or before the funnel is properly connected',
    description:
      'The Meta ad engine is built around three coordinated campaign objectives: Attraction, Nurture, and Conversion. Local targeting, campaign structure, audiences, creatives, budgets, tracking, and kill rules are configured before launch. The client then completes an orientation call, signs off the full engine, and gives explicit go-live permission.',
    tools: ['Meta Ads Manager', 'AA Studio Creatives', 'AA Client Dashboard', 'Launch Checklist'],
    items: [
      'Meta Business and ad account access confirmed',
      'Local radius targeting configured',
      'Audience profiles built from client ICP document',
      'Attraction campaign created in Meta Ads Manager',
      'Attraction campaign configured for awareness / reach objective',
      'Nurture campaign created in Meta Ads Manager',
      'Nurture campaign configured for engagement / retargeting objective',
      'Warm audience retargeting pools built in Meta',
      'Retargeting pixels confirmed firing correctly',
      'Conversion campaign created in Meta Ads Manager',
      'Conversion campaign configured for lead generation / direct response objective',
      'Minimum 2 creative variants uploaded per campaign',
      'Minimum 6 total creative variants confirmed live-ready',
      'Budget allocation confirmed',
      'CPL monitoring dashboard set up',
      '7-day underperformer kill rule documented',
      'Landing page confirmed live',
      'WhatsApp Business and DM flow confirmed operational',
      'All ad creatives reviewed with client',
      'DM-to-booking flow walkthrough completed with client',
      'AA Portal orientation completed',
      'Client confirms they understand the dashboard, pipeline, and approval flow',
      'Client gives explicit go-live permission',
      'Engine launched',
      'Day 1 start date confirmed',
    ],
  },
  {
    id: 10,
    title: 'Optimise, Manage, and Convert',
    value: 'R6,000 / month + R2,000 bonus value',
    solves: 'Campaigns that run flat with no improvement, poor enquiry handling, and no accountability',
    description:
      'Once the Proof Brand engine is live, the system moves into active management. The account manager supports the first 48 hours of DM handling, reviews campaign performance every two weeks, kills underperforming creatives, builds the next campaign cycle, manages approvals, and reports pipeline movement inside the AA Portal. The engine is not left running — it is improved every cycle.',
    tools: ['AA Studio', 'AA Portal Approval Flow', 'AA CRM', 'WhatsApp Business'],
    items: [
      'Launch day DM co-management session completed',
      'Real-time coaching on qualifier sequence delivered',
      'Appointment booking flow demonstrated and coached',
      'First 48 hours of DM inbox support completed',
      'Client confirmed self-sufficient on DM handling',

      'Week 1: All campaign performance reviewed and documented',
      'Week 1: CPL and pipeline movement reviewed',
      'Week 1: Underperforming creatives identified',
      'Week 1: Underperforming creatives killed or paused',
      'Week 1: Winning creative patterns documented',
      'Week 1: Next 14-day campaign cycle planned',
      'Week 1: Next 14-day cycle content built in AA Studio',
      'Week 1: New content sent for client approval via portal',
      'Week 1: Approved content scheduled and ready',

      'Week 2: New creative variants launched',
      'Week 2: New creative variants tested against previous winners',
      'Week 2: DM engagement managed and reported in portal',
      'Week 2: Pipeline movement updated inside dashboard',
      'Week 2: Appointments booked and cash collected logged',
      'Bi-weekly optimisation report delivered',
      'Next cycle improvement actions confirmed',
    ],
  },
]

// ─── Bonus Definitions ─────────────────────────────────────────────────────────
// Bonuses have been merged into the relevant 10 Proof Brand delivery steps.
// Keep this empty to avoid duplicate checklist items in the UI.

export const PROOF_BRAND_BONUSES: BonusDef[] = []

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProofBrand({ blankTracker = false }: { blankTracker?: boolean } = {}) {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]))
  const [loading, setLoading] = useState(true)
  const [fetchingSteps, setFetchingSteps] = useState(false)

  useEffect(() => { loadClients() }, [role, user])

  async function loadClients() {
    let q = supabase.from('clients').select('*').eq('tier', TIER_NAME)
    if (role === 'delivery' && user?.id) {
      q = q.eq('account_manager', user.id)
    }
    const { data } = await q
    setClients(data || [])
    setLoading(false)
  }

  async function selectClient(client: any) {
    setSelectedClient(client)
    setFetchingSteps(true)
    setExpandedSteps(new Set([1]))

    let { data } = await (supabase.from('client_deliverables' as any))
      .select('*')
      .eq('client_id', client.id)
      .order('position', { ascending: true })

    // Detect if new-format rows exist (position >= 1000)
    const hasNewFormat = data && data.some((d: any) => d.position >= 1000)

    if (!hasNewFormat) {
      const rows: any[] = []

      for (const step of PROOF_BRAND_STEPS) {
        step.items.forEach((item, idx) => {
          rows.push({ client_id: client.id, title: item, position: step.id * 1000 + idx, is_completed: false, notes: '' })
        })
        rows.push({ client_id: client.id, title: '__notes__', position: step.id * 1000 + 999, is_completed: false, notes: '' })
      }

      for (const bonus of PROOF_BRAND_BONUSES) {
        bonus.items.forEach((item, idx) => {
          rows.push({ client_id: client.id, title: item, position: bonus.stepId * 1000 + idx, is_completed: false, notes: '' })
        })
        rows.push({ client_id: client.id, title: '__notes__', position: bonus.stepId * 1000 + 999, is_completed: false, notes: '' })
      }

      const { data: created } = await (supabase.from('client_deliverables' as any)).insert(rows).select()
      data = created
    }

    // Only keep new-format rows in state
    setDeliverables((data || []).filter((d: any) => d.position >= 1000))
    setFetchingSteps(false)
  }

  async function toggleItem(itemId: string, currentStatus: boolean) {
    const { error } = await (supabase.from('client_deliverables' as any))
      .update({ is_completed: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', itemId)
    if (!error) {
      setDeliverables(prev => prev.map(d => d.id === itemId ? { ...d, is_completed: !currentStatus } : d))
    }
  }

  async function saveNotes(stepId: number, notes: string) {
    const notesRow = deliverables.find(d => d.position === stepId * 1000 + 999)
    if (!notesRow) return
    await (supabase.from('client_deliverables' as any))
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', notesRow.id)
    setDeliverables(prev => prev.map(d => d.id === notesRow.id ? { ...d, notes } : d))
    toast('Notes saved')
  }

  function getStepData(stepId: number) {
    const items = deliverables.filter(d => d.position >= stepId * 1000 && d.position < stepId * 1000 + 999)
    const notesRow = deliverables.find(d => d.position === stepId * 1000 + 999)
    const completed = items.filter(i => i.is_completed).length
    return { items, notesRow, completed, total: items.length }
  }

  function toggleExpand(stepId: number) {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      next.has(stepId) ? next.delete(stepId) : next.add(stepId)
      return next
    })
  }

  // Overall progress across all checklist items
  const allItems = deliverables.filter(d => d.position % 1000 !== 999)
  const totalCompleted = allItems.filter(d => d.is_completed).length
  const totalItems = allItems.length
  const overallPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0

  // Count completed steps (all items done)
  const completedSteps = PROOF_BRAND_STEPS.filter(s => {
    const { completed, total } = getStepData(s.id)
    return total > 0 && completed === total
  }).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--grey)' }}>
      <Loader2 className="spin" size={24} />
      <span style={{ marginLeft: 12, fontFamily: 'DM Mono', fontSize: 12 }}>Loading {TIER_NAME} Pipeline...</span>
    </div>
  )

  return (
    <div className="sprint-panel">

      {/* ── Client List ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <h3 style={{ fontSize: 11, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)', marginBottom: 12 }}>
          {TIER_NAME} Clients
        </h3>
        {clients.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--grey2)', padding: 20, textAlign: 'center' }}>
            No clients in this tier.
          </div>
        ) : clients.map(c => (
          <div
            key={c.id}
            onClick={() => selectClient(c)}
            style={{
              padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: `1px solid ${selectedClient?.id === c.id ? 'var(--teal)' : 'var(--border2)'}`,
              background: selectedClient?.id === c.id ? 'var(--bg3)' : 'var(--bg2)',
              transition: '0.2s',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.business_name}</div>
              <div style={{ fontSize: 10, color: 'var(--grey2)', marginTop: 2 }}>{c.owner_name}</div>
            </div>
            <ChevronRight size={14} color={selectedClient?.id === c.id ? 'var(--teal)' : 'var(--border2)'} />
          </div>
        ))}
      </div>

      {/* ── Delivery Workspace ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {blankTracker ? (
          <div style={{ flex: 1, minHeight: 560 }} />
        ) : !selectedClient ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--grey2)', gap: 12 }}>
            <div style={{ padding: 20, borderRadius: '50%', background: 'var(--bg2)' }}>
              <CheckCircle2 size={32} />
            </div>
            <p style={{ fontSize: 13 }}>Select a client to manage their {TIER_NAME} deliverables.</p>
          </div>

        ) : fetchingSteps ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--grey)' }}>
            <Loader2 className="spin" size={20} />
            <span style={{ fontFamily: 'DM Mono', fontSize: 12 }}>Loading deliverables...</span>
          </div>

        ) : (
          <>
            {/* ── Client Header ── */}
            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontFamily: 'Playfair Display', fontWeight: 700 }}>
                    {selectedClient.business_name}
                  </h2>
                  <p style={{ color: 'var(--teal)', fontSize: 11, fontFamily: 'DM Mono', marginTop: 4 }}>
                    DELIVERY TRACKER · {TIER_NAME.toUpperCase()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <button
                    onClick={() => navigate('/delivery/clients', { state: { openClientId: selectedClient.id, openClientTab: 'proof-brand' } })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      background: 'none', border: '1px solid var(--border2)', borderRadius: 6,
                      cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', transition: '0.15s',
                    }}
                  >
                    <ExternalLink size={11} /> Detailed View
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--teal)', fontFamily: 'DM Mono', lineHeight: 1 }}>
                      {overallPct}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--grey)', fontFamily: 'DM Mono', marginTop: 4 }}>
                      {totalCompleted} / {totalItems} ITEMS
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--grey2)', fontFamily: 'DM Mono', marginTop: 2 }}>
                      {completedSteps} / {PROOF_BRAND_STEPS.length} STEPS
                    </div>
                  </div>
                </div>
              </div>
              {/* Progress Bar */}
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${overallPct}%`, height: '100%',
                  background: 'linear-gradient(90deg, var(--teal-dark), var(--teal))',
                  borderRadius: 99, transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {/* ── Steps List ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

              {PROOF_BRAND_STEPS.map(step => {
                const { items: dbItems, notesRow, completed, total } = getStepData(step.id)
                const isExpanded = expandedSteps.has(step.id)
                const isComplete = total > 0 && completed === total

                return (
                  <div
                    key={step.id}
                    style={{
                      border: `1px solid ${isComplete ? 'rgba(0,229,195,0.4)' : 'var(--border2)'}`,
                      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Step Header Button */}
                    <button
                      onClick={() => toggleExpand(step.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px',
                        background: isComplete ? 'rgba(0,229,195,0.04)' : 'var(--bg2)',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {/* Step Number Pill */}
                      <div style={{
                        minWidth: 34, height: 34, borderRadius: 7,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isComplete ? 'var(--teal)' : 'var(--bg3)',
                        color: isComplete ? 'var(--bg)' : 'var(--grey)',
                        fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, flexShrink: 0,
                      }}>
                        {String(step.id).padStart(2, '0')}
                      </div>

                      {/* Title */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: isComplete ? 'var(--grey)' : 'var(--white)',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          {step.title}
                          {isComplete && <CheckCircle2 size={13} color="var(--teal)" />}
                        </div>
                      </div>

                      {/* Value + Progress + Chevron */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--grey2)' }}>
                          {step.value}
                        </span>
                        <span style={{
                          fontSize: 10, fontFamily: 'DM Mono',
                          color: completed === total && total > 0 ? 'var(--teal)' : 'var(--grey2)',
                          background: 'var(--bg3)', padding: '3px 8px', borderRadius: 4,
                          border: '1px solid var(--border2)',
                        }}>
                          {completed}/{total}
                        </span>
                        {isExpanded
                          ? <ChevronDown size={14} color="var(--grey)" />
                          : <ChevronRight size={14} color="var(--grey)" />}
                      </div>
                    </button>

                    {/* Step Body */}
                    {isExpanded && (
                      <div style={{ padding: '16px 16px 18px', borderTop: '1px solid var(--border2)', background: 'var(--bg)' }}>

                        {/* Solves Banner */}
                        <div style={{
                          marginBottom: 12, fontSize: 11, lineHeight: 1.5,
                          color: 'var(--grey)', fontFamily: 'DM Mono',
                          padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6,
                          borderLeft: '2px solid var(--teal-dark)',
                        }}>
                          <span style={{ color: 'var(--grey2)', marginRight: 6 }}>SOLVES:</span>
                          {step.solves}
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.65, marginBottom: 16 }}>
                          {step.description}
                        </p>

                        {/* Checklist Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                          {step.items.map((itemLabel, idx) => {
                            const dbItem = dbItems.find(d => d.position === step.id * 1000 + idx)
                            if (!dbItem) return null
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleItem(dbItem.id, dbItem.is_completed)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  cursor: 'pointer', padding: '8px 10px', borderRadius: 6,
                                  background: dbItem.is_completed ? 'rgba(0,229,195,0.05)' : 'var(--bg2)',
                                  border: `1px solid ${dbItem.is_completed ? 'rgba(0,229,195,0.18)' : 'var(--border2)'}`,
                                  transition: '0.15s',
                                  userSelect: 'none',
                                }}
                              >
                                <span style={{ color: dbItem.is_completed ? 'var(--teal)' : 'var(--grey2)', flexShrink: 0 }}>
                                  {dbItem.is_completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                                </span>
                                <span style={{
                                  fontSize: 13,
                                  color: dbItem.is_completed ? 'var(--grey2)' : 'var(--white)',
                                  textDecoration: dbItem.is_completed ? 'line-through' : 'none',
                                }}>
                                  {itemLabel}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Tool Badges */}
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                          {step.tools.map(tool => (
                            <span key={tool} style={{
                              fontSize: 10, fontFamily: 'DM Mono', padding: '3px 8px',
                              borderRadius: 4, background: 'var(--bg3)', color: 'var(--grey)',
                              border: '1px solid var(--border2)',
                            }}>
                              {tool}
                            </span>
                          ))}
                        </div>

                        {/* Step Notes */}
                        <textarea
                          key={notesRow?.id}
                          placeholder="Add delivery notes, links, or internal updates..."
                          defaultValue={notesRow?.notes || ''}
                          onBlur={(e) => saveNotes(step.id, e.target.value)}
                          style={{
                            width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)',
                            borderRadius: 6, padding: 12, color: 'var(--white)',
                            fontSize: 12, fontFamily: 'Barlow', resize: 'vertical', minHeight: 60,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* ── Bonuses Divider ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 6 }}>
                <Gift size={13} color="var(--teal)" />
                <span style={{
                  fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase',
                  color: 'var(--grey)', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                  Included Bonuses — No Extra Charge
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border2)' }} />
                <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--teal)', whiteSpace: 'nowrap' }}>
                  R11,000 Value
                </span>
              </div>

              {/* ── Bonus Cards ── */}
              {PROOF_BRAND_BONUSES.map(bonus => {
                const { items: dbItems, notesRow, completed, total } = getStepData(bonus.stepId)
                const isExpanded = expandedSteps.has(bonus.stepId)
                const isComplete = total > 0 && completed === total

                return (
                  <div
                    key={bonus.id}
                    style={{
                      border: `1px solid ${isComplete ? 'rgba(0,229,195,0.4)' : 'var(--border2)'}`,
                      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s',
                    }}
                  >
                    <button
                      onClick={() => toggleExpand(bonus.stepId)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px',
                        background: isComplete ? 'rgba(0,229,195,0.04)' : 'var(--bg2)',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        minWidth: 34, height: 34, borderRadius: 7,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isComplete ? 'var(--teal)' : 'var(--bg3)',
                        flexShrink: 0,
                      }}>
                        <Gift size={14} color={isComplete ? 'var(--bg)' : 'var(--teal)'} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: isComplete ? 'var(--grey)' : 'var(--white)',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          {bonus.title}
                          {isComplete && <CheckCircle2 size={13} color="var(--teal)" />}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--grey2)' }}>
                          {bonus.value}
                        </span>
                        <span style={{
                          fontSize: 10, fontFamily: 'DM Mono',
                          color: completed === total && total > 0 ? 'var(--teal)' : 'var(--grey2)',
                          background: 'var(--bg3)', padding: '3px 8px', borderRadius: 4,
                          border: '1px solid var(--border2)',
                        }}>
                          {completed}/{total}
                        </span>
                        {isExpanded
                          ? <ChevronDown size={14} color="var(--grey)" />
                          : <ChevronRight size={14} color="var(--grey)" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '16px 16px 18px', borderTop: '1px solid var(--border2)', background: 'var(--bg)' }}>
                        <p style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.65, marginBottom: 16 }}>
                          {bonus.description}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                          {bonus.items.map((itemLabel, idx) => {
                            const dbItem = dbItems.find(d => d.position === bonus.stepId * 1000 + idx)
                            if (!dbItem) return null
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleItem(dbItem.id, dbItem.is_completed)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  cursor: 'pointer', padding: '8px 10px', borderRadius: 6,
                                  background: dbItem.is_completed ? 'rgba(0,229,195,0.05)' : 'var(--bg2)',
                                  border: `1px solid ${dbItem.is_completed ? 'rgba(0,229,195,0.18)' : 'var(--border2)'}`,
                                  transition: '0.15s',
                                  userSelect: 'none',
                                }}
                              >
                                <span style={{ color: dbItem.is_completed ? 'var(--teal)' : 'var(--grey2)', flexShrink: 0 }}>
                                  {dbItem.is_completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                                </span>
                                <span style={{
                                  fontSize: 13,
                                  color: dbItem.is_completed ? 'var(--grey2)' : 'var(--white)',
                                  textDecoration: dbItem.is_completed ? 'line-through' : 'none',
                                }}>
                                  {itemLabel}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        <textarea
                          key={notesRow?.id}
                          placeholder="Add delivery notes..."
                          defaultValue={notesRow?.notes || ''}
                          onBlur={(e) => saveNotes(bonus.stepId, e.target.value)}
                          style={{
                            width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)',
                            borderRadius: 6, padding: 12, color: 'var(--white)',
                            fontSize: 12, fontFamily: 'Barlow', resize: 'vertical', minHeight: 60,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Bottom padding */}
              <div style={{ height: 24 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
