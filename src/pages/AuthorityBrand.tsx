import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Loader2, Gift, ExternalLink } from 'lucide-react'
import { useToast } from '../lib/toast'

const TIER_NAME = 'Authority Brand'

// ─── Type Definitions ──────────────────────────────────────────────────────────

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

// ─── Authority Brand Step Definitions ─────────────────────────────────────────

export const AUTHORITY_BRAND_STEPS: StepDef[] = [
  {
    id: 1,
    title: 'Onboard, Audit & Define the Authority Direction',
    value: 'R5,500',
    solves: 'Installing a human element without a clear voice, character, or positioning direction',
    description:
      'The Authority Brand begins by locking in the full Proof Brand foundation plus the human-led authority direction. The client’s sector, market, offer, conversion objective, brand voice, proof assets, current infrastructure, and performance baseline are documented. Then the Authority Direction is defined: what the Brand Avatar should sound like, what personality the audience should associate with the business, what sector knowledge should be communicated, and what authority position the brand should own over the next 6 months.',
    tools: ['Brand Direction Brief', 'AA Client Dashboard', 'AA Studio', 'Infrastructure Audit'],
    items: [
      'AA Client Dashboard account created and client invited',
      'Authority onboarding call completed',
      'Proof Brand performance baseline documented for guarantee measurement reference',
      'Onboarding Brief completed in full',
      'All existing brand assets, proof assets, testimonials, job documentation, and content assets collected',
      'All required access credentials collected: Meta, Instagram, WhatsApp, website, domain, tracking, and booking tools',
      'Sector, service category, and local market documented',
      'Target client profile documented',
      'Average job value confirmed',
      'Core offer and conversion objective confirmed',
      'Current Instagram, Meta, WhatsApp, website, and funnel infrastructure audited',
      'Brand voice and tone documented',
      'On-camera brand direction defined',
      'Sector knowledge areas identified and documented',
      'Personality and character brief written',
      'Brand Direction Document produced and filed',
      '6-month Authority Brand direction confirmed before recruitment begins',
    ],
  },
  {
    id: 2,
    title: 'Build the Authority Command Centre',
    value: 'R7,500 / month',
    solves: 'Scaling a more complex content and ad system without dedicated visibility or strategic oversight',
    description:
      'The AA Client Dashboard is configured as the operating system for the Authority Brand. It tracks Proof Brand delivery, avatar recruitment, candidate shortlisting, content approvals, campaign status, pipeline movement, daily updates, monthly strategy calls, and advanced reporting. Because Authority Brand includes more moving parts than Proof Brand, the client receives priority account management and a clearer escalation structure.',
    tools: ['AA Portal', 'Priority AM Assignment', 'AA Portal Advanced Reporting', 'AA CRM'],
    items: [
      'Client dashboard workspace configured',
      'Client portal access granted and login confirmed',
      'Priority account manager assigned',
      'Faster response time SLA confirmed with client',
      'Escalation process explained to client',
      'Approval flow created for avatar candidates, scripts, content, ads, landing page, and launch assets',
      'Proof Brand delivery tracker configured inside dashboard',
      'Avatar recruitment tracker configured inside dashboard',
      'Campaign status tracker configured',
      'Pipeline dashboard configured for client',
      'All 5 pipeline stages created: Profile Visits → DMs Started → Qualified Leads → Appointments Booked → Cash Collected',
      'Daily AM update structure created',
      'AA Portal advanced reporting configured',
      'Monthly strategy call scheduled as recurring calendar invite',
      'Client shown where all assets, candidates, approvals, content, campaign updates, and performance data will live',
    ],
  },
  {
    id: 3,
    title: 'Launch the Avatar Recruitment Campaign',
    value: 'R8,000',
    solves: 'Needing a credible online persona but having no structured way to attract, filter, and select the right candidate',
    description:
      'The Brand Avatar is the key difference between Proof Brand and Authority Brand. Before selecting the person who will represent the business online, AA creates a recruitment campaign to source candidates through Facebook and Instagram ads. The campaign attracts potential on-camera representatives, filters them through a clear application process, and creates a candidate pipeline for review. The objective is not to find any creator — it is to find a believable, brand-aligned online persona who can represent the business for a minimum 6-month authority campaign.',
    tools: ['Meta Ads Manager', 'Avatar Recruitment Funnel', 'AA CRM', 'AA Client Dashboard'],
    items: [
      'Avatar role requirements defined from Brand Direction Document',
      'Candidate profile created: age range, tone, presentation style, sector fit, location, availability, and on-camera ability',
      'Avatar recruitment offer written',
      'Avatar recruitment ad copy written',
      'Avatar recruitment creative brief created',
      'Avatar application form created',
      'Candidate qualification questions written',
      'Application review criteria documented',
      'Candidate scoring rubric created',
      'Recruitment landing page or application page built',
      'Facebook and Instagram recruitment campaign created in Meta Ads Manager',
      'Recruitment campaign targeting configured',
      'Recruitment tracking connected to AA CRM',
      'Recruitment campaign reviewed and approved by client',
      'Recruitment campaign launched',
      'Candidate pipeline opened inside AA Client Dashboard',
    ],
  },
  {
    id: 4,
    title: 'Interview, Select & Contract the Brand Avatar',
    value: 'R12,000',
    solves: 'Using a face for the brand without validating fit, trust, availability, or long-term consistency',
    description:
      'Once candidates are sourced, AA filters, interviews, shortlists, and selects the Brand Avatar. The selected person is contracted for a minimum 6-month authority content commitment and onboarded into the brand system. This ensures the client is not relying on inconsistent freelancers or random UGC creators. The Avatar becomes an intentional online persona associated with the brand — briefed, directed, scripted, and managed by AA Studio.',
    tools: ['AA Talent Partner Network', 'AA CRM', 'Avatar Interview Scorecard', 'AA Studio Direction'],
    items: [
      'Candidate applications reviewed',
      'Unqualified candidates removed from pipeline',
      'Qualified candidates scored using avatar scorecard',
      'Shortlist created for client review',
      'Interview questions prepared',
      'First-round avatar interviews completed',
      'Candidate test video or sample delivery requested',
      'Candidate test videos reviewed',
      'Final candidate shortlist presented to client',
      'Preferred Brand Avatar selected',
      'Backup avatar candidate identified',
      '6-month avatar commitment confirmed',
      'Avatar usage expectations confirmed: filming cadence, content rights, availability, revision process, and brand representation boundaries',
      'Avatar contract or creator agreement issued',
      'Avatar contract signed',
      'Avatar onboarded into AA Studio production system',
      'Avatar briefed using full Brand Direction Document',
      'Avatar direction approved by client',
    ],
  },
  {
    id: 5,
    title: 'Rebuild the Profile & Conversion Infrastructure for Authority',
    value: 'R9,000',
    solves: 'Sending authority traffic to a profile or conversion path that still feels generic, weak, or proof-only',
    description:
      'The client’s public-facing infrastructure is upgraded from a basic proof presence into an authority-led brand presence. The Instagram profile, bio, highlights, pinned posts, link-in-bio page, landing page, WhatsApp Business pathway, and conversion tracking are updated to reflect the new human-led authority positioning. The profile should no longer say only “credible business.” It should say “the expert in this space.”',
    tools: ['Instagram', 'Lovable Landing Page', 'WhatsApp Business', 'Meta Pixel', 'AA Client Dashboard'],
    items: [
      'Current Instagram profile reviewed against Authority Brand positioning',
      'Bio repositioned to signal category expertise',
      'Profile CTA updated to match authority-level conversion objective',
      '"Start Here" brand introduction highlight created',
      'FAQ highlight created and populated',
      'Social proof highlight created and populated',
      'Authority / education highlight created',
      'Pinned post strategy updated for authority positioning',
      'Link-in-bio page updated with authority-level copy',
      'Refined conversion path confirmed',
      'Landing page structure reviewed',
      'Landing page copy upgraded with authority positioning, proof, and buyer psychology',
      'Landing page updated or rebuilt on Lovable',
      'Landing page connected to correct CTA destination',
      'WhatsApp Business profile configured or optimised',
      'DM / form / booking pathway confirmed operational',
      'Tracking pixels installed or verified',
      'Conversion tracking tested and verified',
      'A/B test variant 1 created',
      'A/B test variant 2 created',
      'Profile authority rebuild approved by client',
      'Authority conversion infrastructure confirmed live',
    ],
  },
  {
    id: 6,
    title: 'Build the First Authority Content Foundation',
    value: 'R11,500',
    solves: 'Launching an Avatar without enough scripts, proof content, or authority posts to make the shift believable',
    description:
      'Before the Authority engine goes live, AA builds the first authority content foundation. This includes the first 12 Avatar scripts, the first six authority posts, and the proof-led content needed to keep the Proof Brand engine running at the same time. The brand does not abandon proof content — it adds a human-led authority layer on top of it.',
    tools: ['AA Studio', 'Avatar Script Library', 'AA Portal Approval Flow', 'Instagram'],
    items: [
      'Available proof assets reviewed for first content cycle',
      'Authority content categories confirmed: education, opinion, objection-handling, proof framing, and direct conversion',
      'Educational hook scripts 1–4 written',
      'Objection-handling scripts 5–8 written',
      'Direct conversion CTA scripts 9–12 written',
      'All 12 scripts reviewed for sector relevance',
      'All 12 scripts reviewed for brand voice',
      'Script library delivered inside AA Portal',
      'Script library approved for production',
      'Post 1 — Authority / educational content: created and captioned',
      'Post 2 — Authority / educational content: created and captioned',
      'Post 3 — Avatar / online persona introduction: created and captioned',
      'Post 4 — Opinion / sector insight post: created and captioned',
      'Post 5 — Objection-handling post: created and captioned',
      'Post 6 — Brand positioning / category leadership post: created and captioned',
      'Proof Brand content batch reviewed for simultaneous output',
      'Proof-led job documentation or result post created',
      'Proof-led process or behind-the-scenes post created',
      'Proof-led testimonial or credibility post created',
      'All authority and proof foundation posts uploaded for client review',
      'All foundation posts approved by client',
      'All foundation posts published or scheduled to profile',
      'Profile confirmed ready to receive authority and proof traffic',
    ],
  },
  {
    id: 7,
    title: 'Upgrade the Funnel Strategy Documents',
    value: 'R19,500',
    solves: 'Proof-led content that creates credibility but does not build familiarity, trust, relationship, or category authority',
    description:
      'The Proof Brand funnel documents are upgraded into Authority Brand documents. Attraction is expanded with video views, hooks, sector opinions, and insider knowledge. Nurture is expanded with educational reels, process explainers, and trust-building Avatar content. Conversion is expanded with human-led objection handling, testimonial framing videos, and direct-to-camera booking CTAs. The result is a funnel that still proves the business can deliver, but now also makes the market feel like they know and trust the brand.',
    tools: ['Updated Attraction Doc', 'Updated Nurture Doc', 'Updated Conversion Doc', 'AA Studio', 'Meta Ads Manager'],
    items: [
      'Proof Brand Attraction Positioning Document reviewed and audited',
      'Authority Attraction strategy defined',
      'Hook content strategy added to attraction document',
      'Sector-relevant opinion framework created',
      '"Insider knowledge" post strategy documented',
      'Video view campaign logic added to attraction document',
      'Engagement campaign logic added to attraction document',
      'Updated Attraction Positioning Document produced and filed',

      'Proof Brand Nurture Positioning Document reviewed and audited',
      'Authority Nurture strategy defined',
      'Educational reels strategy added to nurture document',
      'Opinion content framework documented',
      'Sector insight post strategy defined',
      'Process explainer content plan created',
      'Human-led trust-building rotation documented',
      'Updated Nurture Positioning Document produced and filed',

      'Proof Brand Conversion Positioning Document reviewed and audited',
      'Authority Conversion strategy defined',
      'Human-led objection-handling content scripted',
      'Testimonial framing video concepts created',
      'Direct-to-camera booking CTA scripts written',
      'Primary objection and hesitation updated in conversion document',
      'Key proof point that converts updated',
      'Updated Conversion Positioning Document produced and filed',

      'All 3 upgraded positioning documents reviewed internally',
      'All 3 upgraded positioning documents sent to client for approval',
      'All 3 upgraded positioning documents approved by client',
    ],
  },
  {
    id: 8,
    title: 'Install the Bi-Weekly Avatar Production Cycle',
    value: 'R8,000 / month',
    solves: 'Having a Brand Avatar with no consistent production structure to activate them',
    description:
      'The Brand Avatar is integrated into a bi-weekly production cadence. Every two weeks, AA reviews performance, writes new scripts, briefs the Avatar, films or collects content, edits to brand standard, sends content for approval, and launches approved assets into the campaign structure. The Avatar is never left to improvise. Every video is scripted, directed, measured, and connected to the Proof Brand engine running alongside it.',
    tools: ['AA Studio Direction', 'Avatar Brief Templates', 'AA Portal Approval Flow', 'AA CRM'],
    items: [
      '6-month Avatar production calendar created',
      'Bi-weekly production cadence confirmed with Avatar',
      'Bi-weekly production cadence confirmed with client',
      'Avatar filming requirements documented',
      'Avatar content submission process confirmed',
      'Avatar revision process confirmed',
      'Proof Brand content output cadence aligned with Avatar cycle',
      'Week 1: Prior cycle performance reviewed and documented',
      'Week 1: Winning content patterns identified',
      'Week 1: New scripts written based on what is converting',
      'Week 1: Avatar brief prepared',
      'Week 1: Avatar / UGC creator briefed with new scripts',
      'Week 1: Content filmed or collected from Avatar',
      'Week 1: Proof Brand content assets collected or produced in parallel',
      'Week 2: Avatar content edited to brand standard in AA Studio',
      'Week 2: Proof Brand content edited to brand standard in AA Studio',
      'Week 2: Content sent for client approval via AA Portal',
      'Week 2: Client revisions completed',
      'Week 2: Approved content scheduled',
      'Week 2: Approved content launched in campaigns',
      'Production cycle documented for repeatability across the 6-month contract',
    ],
  },
  {
    id: 9,
    title: 'Build and Launch the 5-Objective Paid Media Engine',
    value: 'R13,000',
    solves: 'Only running lead-gen campaigns when authority content can compound reach, engagement, retargeting, and conversion at lower cost',
    description:
      'The Proof Brand runs three core campaign objectives. Authority Brand expands the engine to five: Awareness, Video Views, Engagement, Nurture Retargeting, and Conversion. Awareness builds reach. Video Views build cheap warm audiences. Engagement builds algorithmic distribution signals. Nurture compounds trust with viewers and engagers. Conversion moves hot prospects to book. The full funnel runs simultaneously, with Avatar content and Proof Brand content working together.',
    tools: ['Meta Ads Manager', '5-Objective Campaign Structure', 'AA Studio Creatives', 'AA Client Dashboard'],
    items: [
      'Meta Business and ad account access confirmed',
      'Local radius targeting configured',
      'Audience profiles built from client ICP document',
      'Awareness campaign created in Meta Ads Manager',
      'Awareness campaign configured for broad reach objective',
      'Video Views campaign created in Meta Ads Manager',
      'Video Views campaign configured for cheapest warm audience building',
      'Engagement campaign created in Meta Ads Manager',
      'Engagement campaign configured for algorithmic distribution signals',
      'Nurture Retargeting campaign created in Meta Ads Manager',
      'Warm audience pools built from video viewers, engagers, profile visitors, website visitors, and prior leads where available',
      'Nurture Retargeting campaign configured for warm audiences who have watched or engaged',
      'Conversion campaign created in Meta Ads Manager',
      'Conversion campaign configured for hot audiences ready to book',
      'Proof Brand creatives uploaded into relevant campaign layers',
      'Avatar / authority creatives uploaded into relevant campaign layers',
      'Minimum creative variants confirmed across all 5 objectives',
      'CPV monitoring set up for video view campaigns',
      'CPL monitoring set up for conversion campaigns',
      'Engagement and retargeting metrics configured in dashboard',
      '7-day underperformer kill rule documented',
      'Budget allocation confirmed across all 5 objectives',
      'Full funnel structure reviewed internally',
      'Full funnel structure sent to client for approval',
      'Full funnel structure approved by client',
    ],
  },
  {
    id: 10,
    title: 'Go Live, Manage, Optimise & Scale for 6 Months',
    value: 'R15,500 / month',
    solves: 'Launching an authority system without alignment, active management, avatar oversight, or long-term compounding',
    description:
      'Before launch, the client completes an Authority Orientation Call where the Avatar, upgraded positioning documents, profile, content foundation, 5-objective ad engine, dashboard, and first 14-day cycle are reviewed. Once approved, the Authority engine goes live. From there, AA manages the system for the 6-month contract: Avatar production, Proof Brand output, campaign optimisation, pipeline reporting, monthly strategy calls, and content direction refinement.',
    tools: ['AA Client Dashboard', 'Launch Checklist', 'Avatar Go-Live Brief', 'Monthly Strategy Call', 'AA Portal Advanced Reporting'],
    items: [
      'Brand Avatar confirmed operational',
      'Avatar contract confirmed active for minimum 6-month commitment',
      'All 3 upgraded positioning documents approved',
      'Profile authority rebuild approved',
      'Conversion infrastructure confirmed live',
      'First 14-day authority cycle content ready and staged',
      'First 14-day Proof Brand content cycle ready and staged',
      'Avatar / authority content approved for launch',
      '5-campaign structure reviewed and signed off by client',
      'AA Portal advanced reporting confirmed live',
      'DM-to-booking flow walkthrough completed with client',
      'Dashboard and pipeline orientation completed with client',
      'Client sign-off received on full Authority Brand system',
      'Authority engine launched',
      'Go-live date confirmed',

      'Launch week: first Avatar content published',
      'Launch week: first Proof Brand content published',
      'Launch week: Awareness campaign live',
      'Launch week: Video Views campaign live',
      'Launch week: Engagement campaign live',
      'Launch week: Nurture Retargeting campaign live',
      'Launch week: Conversion campaign live',

      'First 48 hours of DM and enquiry support completed',
      'Real-time coaching on qualifier sequence delivered',
      'Appointment booking flow demonstrated and coached',
      'Client confirmed self-sufficient on enquiry handling',

      'Month 1 strategy call completed',
      'Content direction reviewed during strategy call',
      'Avatar performance reviewed during strategy call',
      'Ad spend allocation reviewed during strategy call',
      'Campaign scaling decisions documented',
      'What to kill, keep, and scale documented',

      'Bi-weekly performance review completed',
      'Underperforming creatives identified',
      'Underperforming creatives paused or killed',
      'Winning content patterns documented',
      'Next 14-day Authority content cycle planned',
      'Next 14-day Proof Brand content cycle planned',
      'New scripts written for Avatar',
      'Avatar briefed for next cycle',
      'New creative variants launched',
      'Pipeline movement updated inside dashboard',
      'Appointments booked and cash collected logged',
      'Bi-weekly optimisation report delivered',
      'Next cycle improvement actions confirmed',
      '6-month authority compounding cycle maintained',
    ],
  },
]

// ─── Bonus Definitions ─────────────────────────────────────────────────────────
// Bonuses have been merged into the relevant 10 Authority Brand delivery steps.
// Keep this empty to avoid duplicate checklist items in the UI.

export const AUTHORITY_BRAND_BONUSES: BonusDef[] = []
// ─── Component ─────────────────────────────────────────────────────────────────

export default function AuthorityBrand({ blankTracker = false }: { blankTracker?: boolean } = {}) {
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

      for (const step of AUTHORITY_BRAND_STEPS) {
        step.items.forEach((item, idx) => {
          rows.push({ client_id: client.id, title: item, position: step.id * 1000 + idx, is_completed: false, notes: '' })
        })
        rows.push({ client_id: client.id, title: '__notes__', position: step.id * 1000 + 999, is_completed: false, notes: '' })
      }

      for (const bonus of AUTHORITY_BRAND_BONUSES) {
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

  const allItems = deliverables.filter(d => d.position % 1000 !== 999)
  const totalCompleted = allItems.filter(d => d.is_completed).length
  const totalItems = allItems.length
  const overallPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0

  const completedSteps = AUTHORITY_BRAND_STEPS.filter(s => {
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
                    onClick={() => navigate('/delivery/clients', { state: { openClientId: selectedClient.id, openClientTab: 'authority-brand' } })}
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
                      {completedSteps} / {AUTHORITY_BRAND_STEPS.length} STEPS
                    </div>
                  </div>
                </div>
              </div>
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

              {AUTHORITY_BRAND_STEPS.map(step => {
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
                    <button
                      onClick={() => toggleExpand(step.id)}
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

                        <div style={{
                          marginBottom: 12, fontSize: 11, lineHeight: 1.5,
                          color: 'var(--grey)', fontFamily: 'DM Mono',
                          padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6,
                          borderLeft: '2px solid var(--teal-dark)',
                        }}>
                          <span style={{ color: 'var(--grey2)', marginRight: 6 }}>SOLVES:</span>
                          {step.solves}
                        </div>

                        <p style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.65, marginBottom: 16 }}>
                          {step.description}
                        </p>

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
                  R15,000 Value
                </span>
              </div>

              {/* ── Bonus Cards ── */}
              {AUTHORITY_BRAND_BONUSES.map(bonus => {
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
                        background: isComplete ? 'var(--teal)' : 'var(--bg3)', flexShrink: 0,
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

              <div style={{ height: 24 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
