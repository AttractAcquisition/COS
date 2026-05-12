import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Loader2, Gift, Zap, ExternalLink } from 'lucide-react'
import { useToast } from '../lib/toast'

const TIER_NAME = 'Proof Sprint'

// ─── Type Definitions ──────────────────────────────────────────────────────────

interface StepDef {
  id: number
  phase: 1 | 2
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

// ─── Sprint Step Definitions ───────────────────────────────────────────────────

export const SPRINT_STEPS: StepDef[] = [
  {
    id: 1,
    phase: 1,
    title: 'Lock the Market, Offer & Sprint Strategy',
    value: 'R4,000',
    solves: 'Running generic ads that represent nobody and convert nobody',
    description:
      'The Sprint begins by collecting the business intelligence required to test real demand properly. The client’s service, location radius, average job value, proof assets, competitors, buying triggers, and target customer intent are documented. A Strategic Plan of Action is produced so the Sprint enters the market with one clear positioning formula, one defined service category, one local demand thesis, and one measurable objective: prove whether strangers in the area will enquire online.',
    tools: ['AA Brief Form', 'Market Research', 'Competitor Analysis', 'Strategic Plan of Action'],
    items: [
      'AA Brief Form completed in full',
      'Client niche and geography recorded in exclusivity register',
      'SPOA signed — market exclusivity lock activated from sign date',
      'Competing businesses in area confirmed as unavailable',
      'Services, average job value, and location radius documented',
      'Proof images collected from client',
      'Market context researched and documented',
      'Competitor landscape mapped for client area',
      'Pipeline gaps identified and noted',
      'Core transformation type identified: visual, functional, or emotional',
      'Primary buying trigger locked: urgent, aesthetic, preventative, or status',
      'Top 3 customer intents documented',
      'Dominant competitor angle in the area researched and noted',
      'Strategic objectives defined',
      'Projected impact ranges calculated using average job value and local demand assumptions',
      'Single dominant positioning formula locked',
      'Strategic Plan of Action completed and delivered to client',
    ],
  },
  {
    id: 2,
    phase: 1,
    title: 'Produce the Proof Ad Creative',
    value: 'R3,500',
    solves: 'Ads that fail to stop scroll or communicate capability in the first frame',
    description:
      'The strongest available proof assets are turned into scroll-stopping ads. The primary creative is built around a simple proof sequence: the before state, the after state, and an outcome-driven overlay that handles the main objection. These are not brand awareness graphics. They are visual demand-test assets designed to make a local buyer believe the business can solve their problem.',
    tools: ['AA Studio', 'Before/After Framework', 'Outcome Copy'],
    items: [
      'Before/after images received from client',
      'Best proof assets selected for production',
      'Before/after images approved for production',
      'Top objection identified',
      'Frame 1 — raw, imperfect before state produced',
      'Frame 2 — clean, desirable after state produced',
      'Frame 3 — outcome-driven overlay copy written',
      'Top objection addressed in Frame 3 overlay',
      'Primary proof ad completed',
      'Primary proof ad reviewed internally',
      'Minimum 2 AA Studio creative variants finalised',
    ],
  },
  {
    id: 3,
    phase: 1,
    title: 'Create the Creative Variant Suite',
    value: 'R1,500',
    solves: 'Single-creative tests that produce no actionable data on angle or format',
    description:
      'A controlled creative variant suite is produced to test which angle creates the strongest response. The Sprint does not rely on one ad. It tests pain-based messaging, outcome-based messaging, and offer-based messaging against the same positioning lock. This gives the first seven days enough creative variation to identify early demand patterns instead of guessing from one asset.',
    tools: ['AdCreative.ai', 'AA Studio', 'Pain-Based Variants', 'Offer-Based Variants'],
    items: [
      'AdCreative.ai account configured or production workspace prepared',
      'Pain-based ad variant produced: what the problem costs',
      'Outcome-based ad variant produced: what the result looks like',
      'Offer-based ad variant produced: what the next step is',
      'All variants reviewed against the positioning lock',
      'Creative variants checked for clarity, local relevance, and conversion objective',
      'Minimum 4 creatives total prepared for market entry',
      'All creative assets exported and filed for campaign build',
    ],
  },
  {
    id: 4,
    phase: 1,
    title: 'Build the Lead Magnet Funnel',
    value: 'R2,000',
    solves: "Losing lower-intent demand that isn't ready to message yet",
    description:
      'Not every prospect is ready to send a WhatsApp message immediately. The lead magnet campaign captures lower-intent demand through a value-first asset such as a Price Guide, Buyer’s Checklist, Common Mistakes guide, or Before-You-Hire guide. This creates a second demand signal beyond direct messages: people willing to exchange their contact details for help related to the service.',
    tools: ['Claude Build', 'Meta Instant Form', 'AA Pipeline'],
    items: [
      'Lead magnet format selected for vertical: Price Guide, Checklist, Common Mistakes, or Before-You-Hire guide',
      'Lead magnet angle written around the client’s service and buyer intent',
      'Lead magnet content written',
      'Lead magnet designed and prepared for delivery',
      'Meta Instant Form created',
      'Instant Form fields added: name, phone number, and service interest',
      'Lead magnet form copy written',
      'Thank-you message or next-step instruction added',
      'Form tested internally',
      'Submission routing confirmed',
      'Lead magnet connected to AA Pipeline',
      'Submission notification and handling process set up',
    ],
  },
  {
    id: 5,
    phase: 1,
    title: 'Install the WhatsApp Conversion Flow',
    value: 'R2,500',
    solves: 'Inbound messages that die unanswered and never become bookings',
    description:
      'Before paid traffic starts, the WhatsApp conversion flow is installed and tested. This includes the auto-first response, qualification sequence, urgency capture, location capture, service-type questions, and a structured move toward a booking or price discussion. The Sprint is not only testing ad demand. It is testing whether demand can be converted into real sales conversations.',
    tools: ['WhatsApp Business', 'DM Script Framework', 'Qualifier Sequence'],
    items: [
      'WhatsApp Business account verified and configured',
      'Sector-specific qualifier script written',
      'Auto-first response message scripted',
      'Auto-first response message activated',
      'Qualification questions written: service type, urgency, and location',
      'Structured close toward price discussion or booking written',
      'Move-toward-booking framework embedded in the script',
      'Script rules embedded: no long paragraphs, no delays, always advance the conversation',
      '5-minute response rule briefed to client',
      'Full WhatsApp flow tested end-to-end before Day 1',
      'DM script framework delivered to client before launch',
    ],
  },
  {
    id: 6,
    phase: 1,
    title: 'Build and Launch the Dual-Campaign Meta Test',
    value: 'R4,500',
    solves: 'Single-objective ads that capture one intent layer and miss all others',
    description:
      'Two campaigns are built and launched at the same time. Campaign 01 sends high-intent prospects directly to WhatsApp using the Conversations objective. Campaign 02 captures lower-intent prospects through the lead magnet using the Leads objective. Together, these two campaigns test both immediate buying intent and softer market interest.',
    tools: ['Meta Ads Manager', 'Conversations Objective', 'Leads Objective', 'AA Targeting System'],
    items: [
      'AA Targeting Prompt completed for the client’s buyer profile',
      'Radius targeting defined',
      'Interest stack defined',
      'Age range defined',
      'Exclusion list defined',
      'Campaign 01 created — WhatsApp Conversations objective',
      'Campaign 01 targeting configured: radius, interests, age range, and exclusions',
      'WhatsApp keyword trigger set up',
      'WhatsApp keyword trigger tested end-to-end',
      'Campaign 01 creatives uploaded',
      'Campaign 02 created — Leads objective for lead magnet',
      'Campaign 02 targeting configured using AA Targeting Prompt output',
      'Campaign 02 creatives uploaded',
      'Meta Instant Form connected to Campaign 02',
      'Both campaigns reviewed against ICP before launch',
      'Client approval obtained for both campaigns',
      'WhatsApp Conversion campaign launched',
      'Lead Magnet campaign launched',
      'Day 1 Sprint start date confirmed',
    ],
  },
  {
    id: 7,
    phase: 2,
    title: 'Track Daily Demand Signals',
    value: 'R3,000',
    solves: "Running campaigns blind with no signal on what's working and what's wasting budget",
    description:
      'Every day of the 14-day Sprint, the core demand metrics are tracked. The first three days are treated as a stabilisation window where the ads exit learning, delivery is monitored, and technical breakages are checked before premature decisions are made. This creates a clean dataset for judging whether demand exists.',
    tools: ['Meta Ads Manager', 'Daily Tracking Log', 'AA Dashboard'],
    items: [
      'Daily tracking log activated from Day 1',
      'Daily spend tracked',
      'CPM tracked',
      'CTR tracked',
      'Cost per WhatsApp message tracked',
      'Cost per lead tracked',
      'DMs started tracked',
      'Leads generated tracked',
      'Days 1–3 stabilisation protocol documented',
      'Days 1–3 stabilisation protocol followed',
      'Flow breakage check completed within the first 72 hours',
      'WhatsApp routing checked',
      'Lead form routing checked',
      'No premature changes made before stabilisation phase ends',
      'Daily data recorded for the full Sprint period',
    ],
  },
  {
    id: 8,
    phase: 2,
    title: 'Optimise the Sprint: Kill, Scale, or Rotate',
    value: 'R2,000',
    solves: 'Budget bleeding into dead creatives and missed scaling opportunities on winners',
    description:
      'The Sprint has two optimisation windows. During Days 4–7, early kill rules are enforced so weak creatives stop wasting spend. During Days 8–14, winning angles are supported, underperformers are cut more aggressively, and new creative variants are introduced if the data warrants it. The goal is not to optimise forever. The goal is to produce the clearest possible demand signal inside 14 days.',
    tools: ['Kill Rules Protocol', 'Scale Rules Protocol', 'Creative Rotation'],
    items: [
      'First optimisation review completed during Days 4–7',
      'CPL reviewed against R120 threshold',
      'Kill rule applied: CPL over R120 creatives paused',
      'Message volume reviewed against spend',
      'Kill rule applied: no messages after R300 spend creatives paused',
      'CTR reviewed against 1% threshold',
      'Kill rule applied: CTR under 1% creatives replaced',
      'Cost per message reviewed against R40 scale threshold',
      'Scale rule applied: cost per message under R40 → budget increased where appropriate',
      'Acceleration Phase executed during Days 8–14',
      'Winning creatives doubled down where data supports it',
      'Underperforming creatives cut aggressively',
      '1–2 new creatives introduced in Acceleration Phase where data warrants',
      'All optimisation decisions documented in the Sprint log',
    ],
  },
  {
    id: 9,
    phase: 2,
    title: 'Deliver the Day 7 Demand Signal Report',
    value: 'R750',
    solves: 'Running blind for 14 days with no interim read on where the market is going',
    description:
      'At Day 7, the client receives a direct mid-sprint demand signal report. This is not a polished monthly report. It is a clear operational read: how much has been spent, how many WhatsApp conversations started, how many leads were generated, whether the signal is strong, mixed, or weak, and whether anything in the WhatsApp or lead handling flow is blocking conversion.',
    tools: ['WhatsApp Report', 'Mid-Sprint Brief', 'Demand Signal Read'],
    items: [
      'Day 7 spend compiled',
      'Day 7 WhatsApp DMs started compiled',
      'Day 7 lead magnet leads compiled',
      'Cost per message calculated',
      'Cost per lead calculated',
      'Demand signal read determined: strong, mixed, or weak',
      'WhatsApp conversion flow performance assessed',
      'Lead magnet form performance assessed',
      'Response sequence breakdown identified if present',
      'Client-facing Day 7 summary written',
      'Day 7 report delivered to client via WhatsApp',
      'Client response and sentiment recorded',
      'Second-half Sprint action direction confirmed: continue, optimise, or pivot',
    ],
  },
  {
    id: 10,
    phase: 2,
    title: 'Deliver the Demand Proof Document & Proof Brand Handoff',
    value: 'R4,500',
    solves: 'Walking away from 14 days of data with nothing documented and no strategic direction',
    description:
      'At the end of the Sprint, AA prepares the Demand Proof Document. It shows the full 14-day dataset, total spend, total inbound demand, cost per result, booking rate, early revenue if available, and the final demand proof determination. The document answers one question with evidence: does real, measurable online demand exist for this service in this area? If demand is confirmed, the next step is framed as the Proof Brand install, with the R2,500 Sprint deposit credited against the Proof Brand setup fee.',
    tools: ['Results Report', 'Demand Proof Document', 'Proof Brand Brief'],
    items: [
      'Day 13 full dataset compiled',
      'All daily logs reviewed',
      'Total ad spend calculated',
      'Total WhatsApp DMs calculated',
      'Total lead magnet leads calculated',
      'Total inbound demand calculated: DMs + leads combined',
      'Cost per result calculated',
      'Booking rate documented',
      'Early revenue documented if cash has been collected',
      'WhatsApp campaign performance summarised',
      'Lead magnet campaign performance summarised',
      'Best-performing creative angle identified',
      'Best-performing campaign objective identified',
      'Demand proof determination made: demand confirmed, inconclusive, or negative',
      'Demand Proof Document completed and filed',
      'Strategic recommendation written',
      'Next step framed and presented to client',
      'Proof Brand install recommended if demand is confirmed',
      'Client decision to proceed or not proceed documented',
      'R2,500 deposit credit applied to Proof Brand setup fee if client proceeds',
      'Credit transfer confirmed to client in writing',
    ],
  },
]

// ─── Bonus Definitions ─────────────────────────────────────────────────────────
// Bonuses have been merged into the relevant 10 Proof Sprint delivery steps.
// Keep this empty to avoid duplicate checklist items in the UI.

export const SPRINT_BONUSES: BonusDef[] = []

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProofSprint({ blankTracker = false }: { blankTracker?: boolean } = {}) {
  const { role, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
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

    const hasNewFormat = data && data.some((d: any) => d.position >= 1000)

    if (!hasNewFormat) {
      const rows: any[] = []

      for (const step of SPRINT_STEPS) {
        step.items.forEach((item, idx) => {
          rows.push({ client_id: client.id, title: item, position: step.id * 1000 + idx, is_completed: false, notes: '' })
        })
        rows.push({ client_id: client.id, title: '__notes__', position: step.id * 1000 + 999, is_completed: false, notes: '' })
      }

      for (const bonus of SPRINT_BONUSES) {
        bonus.items.forEach((item, idx) => {
          rows.push({ client_id: client.id, title: item, position: bonus.stepId * 1000 + idx, is_completed: false, notes: '' })
        })
        rows.push({ client_id: client.id, title: '__notes__', position: bonus.stepId * 1000 + 999, is_completed: false, notes: '' })
      }

      const { data: created } = await (supabase.from('client_deliverables' as any)).insert(rows).select()
      data = created
    }

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

  async function openSprintData() {
    if (!selectedClient) return
    navigate('/delivery/clients', { state: { openClientId: selectedClient.id, openClientTab: 'sprints' } })
  }

  const allItems = deliverables.filter(d => d.position % 1000 !== 999)
  const totalCompleted = allItems.filter(d => d.is_completed).length
  const totalItems = allItems.length
  const overallPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0

  const completedSteps = SPRINT_STEPS.filter(s => {
    const { completed, total } = getStepData(s.id)
    return total > 0 && completed === total
  }).length

  const phase1Steps = SPRINT_STEPS.filter(s => s.phase === 1)
  const phase2Steps = SPRINT_STEPS.filter(s => s.phase === 2)

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
              <Zap size={32} color="var(--teal)" />
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
                    onClick={openSprintData}
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
                      {completedSteps} / {SPRINT_STEPS.length} STEPS
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

              {/* Phase 1 Divider */}
              <PhaseDivider
                phase={1}
                label="Sprint Setup"
                sublabel="Complete in ≤72 hours"
                value="R15,000"
                steps={phase1Steps}
                getStepData={getStepData}
              />

              {phase1Steps.map(step => (
                <StepCard
                  key={step.id}
                  step={step}
                  isExpanded={expandedSteps.has(step.id)}
                  onToggle={() => toggleExpand(step.id)}
                  dbData={getStepData(step.id)}
                  onToggleItem={toggleItem}
                  onSaveNotes={saveNotes}
                />
              ))}

              {/* Phase 2 Divider */}
              <PhaseDivider
                phase={2}
                label="Sprint Delivery"
                sublabel="14 days active management"
                value="R7,750"
                steps={phase2Steps}
                getStepData={getStepData}
              />

              {phase2Steps.map(step => (
                <StepCard
                  key={step.id}
                  step={step}
                  isExpanded={expandedSteps.has(step.id)}
                  onToggle={() => toggleExpand(step.id)}
                  dbData={getStepData(step.id)}
                  onToggleItem={toggleItem}
                  onSaveNotes={saveNotes}
                />
              ))}

              {/* Bonuses Divider */}
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
                  R5,000+ Value
                </span>
              </div>

              {/* Bonus Cards */}
              {SPRINT_BONUSES.map(bonus => {
                const { items: dbItems, notesRow, completed, total } = getStepData(bonus.stepId)
                const isExpanded = expandedSteps.has(bonus.stepId)
                const isComplete = total > 0 && completed === total

                return (
                  <div
                    key={bonus.id}
                    style={{
                      border: `1px solid ${isComplete ? 'rgba(0,229,195,0.4)' : 'rgba(255,170,0,0.2)'}`,
                      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s',
                    }}
                  >
                    <button
                      onClick={() => toggleExpand(bonus.stepId)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px',
                        background: isComplete ? 'rgba(0,229,195,0.04)' : 'rgba(255,170,0,0.03)',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        minWidth: 34, height: 34, borderRadius: 7,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isComplete ? 'var(--teal)' : 'rgba(255,170,0,0.12)',
                        color: isComplete ? 'var(--bg)' : 'var(--amber)',
                        fontSize: 12, flexShrink: 0,
                      }}>
                        <Gift size={14} />
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
                        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--amber)' }}>
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
                                  transition: '0.15s', userSelect: 'none',
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
                          placeholder="Add delivery notes, links, or internal updates..."
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Phase Divider ─────────────────────────────────────────────────────────────

function PhaseDivider({
  phase, label, sublabel, value, steps, getStepData
}: {
  phase: number
  label: string
  sublabel: string
  value: string
  steps: StepDef[]
  getStepData: (id: number) => { completed: number; total: number }
}) {
  const phaseCompleted = steps.filter(s => {
    const { completed, total } = getStepData(s.id)
    return total > 0 && completed === total
  }).length
  const isPhaseComplete = phaseCompleted === steps.length

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginTop: phase === 1 ? 0 : 14, marginBottom: 6,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: isPhaseComplete ? 'rgba(0,229,195,0.08)' : 'var(--bg3)',
        border: `1px solid ${isPhaseComplete ? 'rgba(0,229,195,0.3)' : 'var(--border2)'}`,
        borderRadius: 5, padding: '4px 10px', flexShrink: 0,
      }}>
        <Zap size={11} color={isPhaseComplete ? 'var(--teal)' : 'var(--grey2)'} />
        <span style={{
          fontSize: 9, fontFamily: 'DM Mono', textTransform: 'uppercase',
          color: isPhaseComplete ? 'var(--teal)' : 'var(--grey2)', letterSpacing: '0.1em',
        }}>
          Phase {phase} — {label}
        </span>
      </div>
      <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey2)', whiteSpace: 'nowrap' }}>
        {sublabel}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border2)' }} />
      <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--grey)', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Step Card ─────────────────────────────────────────────────────────────────

function StepCard({
  step, isExpanded, onToggle, dbData, onToggleItem, onSaveNotes
}: {
  step: StepDef
  isExpanded: boolean
  onToggle: () => void
  dbData: { items: any[]; notesRow: any; completed: number; total: number }
  onToggleItem: (id: string, current: boolean) => void
  onSaveNotes: (stepId: number, notes: string) => void
}) {
  const { items: dbItems, notesRow, completed, total } = dbData
  const isComplete = total > 0 && completed === total

  return (
    <div style={{
      border: `1px solid ${isComplete ? 'rgba(0,229,195,0.4)' : 'var(--border2)'}`,
      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      <button
        onClick={onToggle}
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
          color: isComplete ? 'var(--bg)' : 'var(--grey)',
          fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, flexShrink: 0,
        }}>
          {String(step.id).padStart(2, '0')}
        </div>

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
                  onClick={() => onToggleItem(dbItem.id, dbItem.is_completed)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', padding: '8px 10px', borderRadius: 6,
                    background: dbItem.is_completed ? 'rgba(0,229,195,0.05)' : 'var(--bg2)',
                    border: `1px solid ${dbItem.is_completed ? 'rgba(0,229,195,0.18)' : 'var(--border2)'}`,
                    transition: '0.15s', userSelect: 'none',
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
            onBlur={(e) => onSaveNotes(step.id, e.target.value)}
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
}
