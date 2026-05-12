import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Circle, ChevronRight, Loader2, Lock, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

type AssetCategoryKey = 'beforePhotos' | 'afterPhotos' | 'logos' | 'brandFiles' | 'testimonials' | 'pdfs'
type AppKey = 'apify' | 'adCreative' | 'metaAds' | 'metaGraph' | 'whatsappBusiness' | 'manyChat' | 'supabase' | 'github'
type ProofSprintDeliverableKey = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9' | 'D10' | 'D11' | 'D12' | 'D13' | 'D14' | 'D15'

type AppTestStatus = 'idle' | 'connected' | 'missing'

interface ClientRow {
  id: string
  business_name: string
  owner_name?: string | null
  tier?: string | null
  account_manager?: string | null
}

interface UploadedAsset {
  name: string
  path: string
  url: string
  uploadedAt: string
}

interface AppConnection {
  enabled: boolean
  apiKey: string
  secret: string
  testStatus: AppTestStatus
}

interface D1State {
  transcript: string
  output: string
  transformationType: string
  buyingTrigger: string
  customerIntents: string
  competitorAngle: string
  positioningGap: string
  dominantFormula: string
  location: string
  radiusKm: string
  serviceVertical: string
  service1: string
  service2: string
  service3: string
  averageJobValue: string
  uspList: string
  socialLinks: string
  testimonials: string
  promotions: string
  sprintGoLiveDate: string
  c1CampaignId: string
  c2CampaignId: string
  metaAccessTokenRef: string
  telegramBotToken: string
  telegramChatId: string
  openclawAgentId: string
  operatorWhatsapp: string
  clientWhatsapp: string
  assets: Record<AssetCategoryKey, UploadedAsset[]>
  apps: Record<AppKey, AppConnection>
}

interface D2State {
  topObjection: string
  selectedAssets: string[]
  output: string
  exportLabels: string[]
}

interface D3State {
  brandColors: string
  output: string
  downloadLabels: string[]
}

interface D4State {
  vertical: string
  buyingTrigger: string
  customerIntents: string
  output: string
  pdfCopy: string
  cta: string
  formFields: string
  guideTopic: string
}

interface D5State {
  targeting: string
  ageRanges: string
  exclusions: string
  budget: string
  keywordTrigger: string
  output: string
}

interface D6State {
  freshAudiences: string
  nonConverters: string
  lookalike: string
  leadFormSetup: string
  budget: string
  output: string
}

interface D7State {
  welcome: string
  jobType: string
  urgency: string
  area: string
  priceBridge: string
  bookingClose: string
  objectionHandler: string
  tyreKickerExit: string
  output: string
}

interface D8State {
  keywordTrigger: string
  responseTree: string
  conditions: string
  phoneCapture: string
  bookingBranch: string
  qaBranches: boolean
  qaMessages: boolean
  qaData: boolean
  output: string
}

type Phase2State = Record<string, any>

interface SprintV2State {
  d1: D1State
  d2: D2State
  d3: D3State
  d4: D4State
  d5: D5State
  d6: D6State
  d7: D7State
  d8: D8State
  d9: Phase2State
  d10: Phase2State
  d11: Phase2State
  d12: Phase2State
  d13: Phase2State
  d14: Phase2State
  d15: Phase2State
}

const ASSET_CATEGORIES: { key: AssetCategoryKey; label: string; accept: string; hint: string }[] = [
  { key: 'beforePhotos', label: 'Before photos', accept: 'image/*', hint: 'Original state, raw proof, comparison lead-in' },
  { key: 'afterPhotos', label: 'After photos', accept: 'image/*', hint: 'Outcome state, result proof, transformation end state' },
  { key: 'logos', label: 'Logos', accept: 'image/*', hint: 'Client logo, co-branding, campaign header assets' },
  { key: 'brandFiles', label: 'Brand files', accept: '.pdf,.png,.jpg,.jpeg,.svg,.zip', hint: 'Brand kit, fonts, references, visual standards' },
  { key: 'testimonials', label: 'Testimonials', accept: '.pdf,.png,.jpg,.jpeg,.txt,.doc,.docx', hint: 'Social proof, reviews, screenshots, voice notes' },
  { key: 'pdfs', label: 'PDFs', accept: '.pdf', hint: 'Reports, briefs, transcripts, source documents' },
]

const APP_DEFS: { key: AppKey; label: string }[] = [
  { key: 'apify', label: 'Apify' },
  { key: 'adCreative', label: 'AdCreative.ai' },
  { key: 'metaAds', label: 'Meta Ads Manager' },
  { key: 'metaGraph', label: 'Meta Graph API' },
  { key: 'whatsappBusiness', label: 'WhatsApp Business API' },
  { key: 'manyChat', label: 'ManyChat' },
  { key: 'supabase', label: 'Supabase' },
  { key: 'github', label: 'GitHub' },
]

const TAB_DEFS = [
  { id: 1, title: 'Tool, Information & Assets', short: 'Intake + D1' },
  { id: 2, title: 'Before / After Proof Ads', short: 'Carousel Copy' },
  { id: 3, title: 'Ad Variants', short: 'AdCreative.ai Prompts' },
  { id: 4, title: 'Lead Magnet', short: 'PDF + Instant Form' },
  { id: 5, title: 'Meta Conversion Campaign', short: 'Campaign 1 Build Sheet' },
  { id: 6, title: 'Meta Leads Campaign', short: 'Campaign 2 Build Sheet' },
  { id: 7, title: 'WhatsApp DM Qualifier Script', short: '6-Message Sales Flow' },
  { id: 8, title: 'WhatsApp Conversion Flow Setup', short: 'ManyChat Logic' },
  { id: 9, title: 'Daily Sprint Metrics Engine', short: 'Automation + Alerts' },
  { id: 10, title: 'Day 3 Stabilisation Protocol', short: 'Stability Report' },
  { id: 11, title: 'Day 4 Optimisation Report', short: 'Action Sheet + SLA' },
  { id: 12, title: 'Day 7 Mid-Sprint Client Update', short: 'Client WhatsApp Update' },
  { id: 13, title: 'Day 8 Acceleration Phase', short: 'Winner Expansion' },
  { id: 14, title: 'Day 13 Final Data Lock', short: 'Locked Totals' },
  { id: 15, title: 'Demand Proof Document', short: 'Final Closeout' },
] as const

function createAppConnections(): Record<AppKey, AppConnection> {
  return APP_DEFS.reduce((acc, app) => {
    acc[app.key] = { enabled: false, apiKey: '', secret: '', testStatus: 'idle' }
    return acc
  }, {} as Record<AppKey, AppConnection>)
}

function createInitialState(): SprintV2State {
  return {
    d1: {
      transcript: '',
      output: '',
      transformationType: '',
      buyingTrigger: '',
      customerIntents: '',
      competitorAngle: '',
      positioningGap: '',
      dominantFormula: '',
      location: '',
      radiusKm: '',
      serviceVertical: '',
      service1: '',
      service2: '',
      service3: '',
      averageJobValue: '',
      uspList: '',
      socialLinks: '',
      testimonials: '',
      promotions: '',
      sprintGoLiveDate: '',
      c1CampaignId: '',
      c2CampaignId: '',
      metaAccessTokenRef: '',
      telegramBotToken: '',
      telegramChatId: '',
      openclawAgentId: '',
      operatorWhatsapp: '',
      clientWhatsapp: '',
      assets: {
        beforePhotos: [],
        afterPhotos: [],
        logos: [],
        brandFiles: [],
        testimonials: [],
        pdfs: [],
      },
      apps: createAppConnections(),
    },
    d2: {
      topObjection: '',
      selectedAssets: [],
      output: '',
      exportLabels: [],
    },
    d3: {
      brandColors: '#6A00F4, #9D4BFF, #EBD7FF',
      output: '',
      downloadLabels: [],
    },
    d4: {
      vertical: '',
      buyingTrigger: '',
      customerIntents: '',
      output: '',
      pdfCopy: '',
      cta: '',
      formFields: '',
      guideTopic: '',
    },
    d5: {
      targeting: '',
      ageRanges: '',
      exclusions: '',
      budget: '',
      keywordTrigger: '',
      output: '',
    },
    d6: {
      freshAudiences: '',
      nonConverters: '',
      lookalike: '',
      leadFormSetup: '',
      budget: '',
      output: '',
    },
    d7: {
      welcome: '',
      jobType: '',
      urgency: '',
      area: '',
      priceBridge: '',
      bookingClose: '',
      objectionHandler: '',
      tyreKickerExit: '',
      output: '',
    },
    d8: {
      keywordTrigger: '',
      responseTree: '',
      conditions: '',
      phoneCapture: '',
      bookingBranch: '',
      qaBranches: false,
      qaMessages: false,
      qaData: false,
      output: '',
    },
    d9: {
      schedule: '08:00 SAST',
      connectedMetaGraphApi: false,
      connectedOpenClaw: false,
      connectedAaDashboard: false,
      connectedNCronScheduler: false,
      metricsToPull: 'Spend, CPM, CTR, Cost per Message, Cost per Lead, DMs Started, Leads Generated',
      alertThresholds: 'Kill if CPA rises 25% above target. Scale if CPL drops 20% below target.',
      firstSuccessfulLog: false,
      internalOnlyDays: true,
      operatorWhatsappDays4Plus: true,
      output: '',
    },
    d10: {
      day1Log: '',
      day2Log: '',
      day3Log: '',
      learningPhaseStatus: '',
      trackingIntegrity: '',
      adDeliveryHealth: '',
      earlyWinningSignals: '',
      redFlags: '',
      stabilityDecision: '',
      stableApproved: false,
      urgentFixes: false,
      output: '',
    },
    d11: {
      days13Performance: '',
      pauseWeakAdSets: false,
      increaseWinners: false,
      swapLowCtrCreatives: false,
      adjustBudgets: false,
      fixAudienceOverlaps: false,
      completedAllActions: false,
      notesEntered: false,
      slaTimer: '2 hours',
      output: '',
    },
    d12: {
      days17Data: '',
      clientReportedLeadsBookings: '',
      progressUpdate: '',
      winsSoFar: '',
      activitySummary: '',
      whatNext: '',
      confidenceBuilderCta: '',
      sendNow: false,
      editBeforeSend: false,
      logReplySentiment: false,
      output: '',
    },
    d13: {
      days17FullData: '',
      lowestCpm: '',
      highestCtr: '',
      bestDmVolume: '',
      bestCpl: '',
      duplicateWinners: false,
      increaseBudgets: false,
      pauseWeakAds: false,
      requestNewCreatives: false,
      rebalanceSpend: false,
      actionsCompleted: false,
      output: '',
    },
    d14: {
      all14DayTotals: '',
      spend: '',
      leads: '',
      dms: '',
      bookings: '',
      revenue: '',
      roasProxy: '',
      bestAd: '',
      worstAd: '',
      bestAudience: '',
      appointmentsBookedConfirmed: false,
      dealsClosedConfirmed: false,
      revenueCollectedConfirmed: false,
      output: '',
    },
    d15: {
      dataset: '',
      positioningFormula: '',
      sprintLogs: '',
      demandResult: 'Confirmed',
      markdownOutput: '',
      pdfOutput: '',
      portalLink: '',
      whatsappDeliveryMessage: '',
      creditApproved: false,
      engagementClosed: false,
      output: '',
    },
  }
}

const TAB_TO_DELIVERABLE: Record<number, ProofSprintDeliverableKey> = {
  1: 'D1',
  2: 'D2',
  3: 'D3',
  4: 'D4',
  5: 'D5',
  6: 'D6',
  7: 'D7',
  8: 'D8',
  9: 'D9',
  10: 'D10',
  11: 'D11',
  12: 'D12',
  13: 'D13',
  14: 'D14',
  15: 'D15',
}

function mergeSprintState(saved?: Partial<SprintV2State> | null): SprintV2State {
  const base = createInitialState()
  if (!saved) return base
  return {
    ...base,
    ...saved,
    d1: { ...base.d1, ...(saved.d1 ?? {}), assets: { ...base.d1.assets, ...(saved.d1?.assets ?? {}) }, apps: { ...base.d1.apps, ...(saved.d1?.apps ?? {}) } },
    d2: { ...base.d2, ...(saved.d2 ?? {}) },
    d3: { ...base.d3, ...(saved.d3 ?? {}) },
    d4: { ...base.d4, ...(saved.d4 ?? {}) },
    d5: { ...base.d5, ...(saved.d5 ?? {}) },
    d6: { ...base.d6, ...(saved.d6 ?? {}) },
    d7: { ...base.d7, ...(saved.d7 ?? {}) },
    d8: { ...base.d8, ...(saved.d8 ?? {}) },
    d9: { ...base.d9, ...(saved.d9 ?? {}) },
    d10: { ...base.d10, ...(saved.d10 ?? {}) },
    d11: { ...base.d11, ...(saved.d11 ?? {}) },
    d12: { ...base.d12, ...(saved.d12 ?? {}) },
    d13: { ...base.d13, ...(saved.d13 ?? {}) },
    d14: { ...base.d14, ...(saved.d14 ?? {}) },
    d15: { ...base.d15, ...(saved.d15 ?? {}) },
  }
}

function sanitizeSprintState(state: SprintV2State): SprintV2State {
  return {
    ...state,
    d1: {
      ...state.d1,
      apps: Object.fromEntries(
        Object.entries(state.d1.apps).map(([key, app]) => [key, { ...app, apiKey: '', secret: '' }]),
      ) as Record<AppKey, AppConnection>,
    },
  }
}

function proofSprintClientDataPatch(clientId: string, state: SprintV2State, deliverableKey: ProofSprintDeliverableKey) {
  return {
    client_id: clientId,
    deliverable_key: deliverableKey,
    input_json: state,
    sprint_go_live_date: state.d1.sprintGoLiveDate || null,
    c1_campaign_id: state.d1.c1CampaignId || null,
    c2_campaign_id: state.d1.c2CampaignId || null,
    meta_access_token_ref: state.d1.metaAccessTokenRef || null,
    openclaw_agent_id: state.d1.openclawAgentId || null,
    operator_whatsapp: state.d1.operatorWhatsapp || null,
    client_whatsapp: state.d1.clientWhatsapp || null,
    running_totals_json: state.d14?.all14DayTotals ? { all14DayTotals: state.d14.all14DayTotals } : {},
    status: state.d15.engagementClosed ? 'completed' : 'draft',
  }
}

function buildPersistedStateFromRow(row: Record<string, any> | null | undefined) {
  if (!row) return createInitialState()
  const savedState = (row.input_json ?? {}) as Partial<SprintV2State>
  return sanitizeSprintState(mergeSprintState(savedState))
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)', marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--grey2)', marginTop: 6, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, lineHeight: 1.5 }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

function TabButton({
  active,
  locked,
  complete,
  title,
  short,
  onClick,
}: {
  active: boolean
  locked: boolean
  complete: boolean
  title: string
  short: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: 12,
        border: `1px solid ${active ? 'var(--teal)' : 'var(--border2)'}`,
        background: locked ? 'rgba(255,255,255,0.02)' : active ? 'rgba(0,229,195,0.06)' : 'var(--bg2)',
        color: locked ? 'var(--grey2)' : active ? 'var(--white)' : 'var(--grey)',
        textAlign: 'left',
        cursor: locked ? 'not-allowed' : 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {complete ? <CheckCircle2 size={14} color="var(--teal)" /> : locked ? <Lock size={12} color="var(--grey2)" /> : null}
        </div>
        <div style={{ fontSize: 11, color: 'var(--grey2)', marginTop: 4, lineHeight: 1.4 }}>{short}</div>
      </div>
      <ChevronRight size={14} color={active ? 'var(--teal)' : 'var(--grey2)'} />
    </button>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card" style={{ display: 'grid', gap: 6 }}>
      <div className="label">{label}</div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 24, color: 'var(--teal)', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--grey)', fontFamily: 'DM Mono' }}>{sub}</div>
    </div>
  )
}

export default function ProofSprintV2() {
  const { role, user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const [clientStates, setClientStates] = useState<Record<string, SprintV2State>>({})
  const [activeTab, setActiveTab] = useState<number>(1)
  const [hydratingClientId, setHydratingClientId] = useState<string | null>(null)
  const [persistenceMode, setPersistenceMode] = useState<'unknown' | 'remote' | 'local'>('unknown')
  const saveTimerRef = useRef<number | null>(null)
  const hydratedClientIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => { loadClients() }, [role, user?.id])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [])

  async function loadClients() {
    setLoading(true)
    let q = supabase.from('clients').select('id, business_name, owner_name, tier, account_manager').eq('tier', 'Proof Sprint').order('created_at', { ascending: false })
    if (role === 'delivery' && user?.id) q = q.eq('account_manager', user.id)
    const { data } = await q
    setClients((data || []) as ClientRow[])
    setLoading(false)
  }

  function ensureClientState(client: ClientRow) {
    setClientStates(prev => {
      if (prev[client.id]) return prev
      return { ...prev, [client.id]: createInitialState() }
    })
  }

  async function loadPersistedClientState(clientId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('proof_sprint_client_data')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      setPersistenceMode('remote')
      return buildPersistedStateFromRow(data)
    } catch {
      setPersistenceMode('local')
      const cached = localStorage.getItem(`proof-sprint-v2-${clientId}`)
      return cached ? mergeSprintState(JSON.parse(cached) as Partial<SprintV2State>) : createInitialState()
    }
  }

  async function saveClientState(clientId: string, deliverableKey: ProofSprintDeliverableKey, state: SprintV2State) {
    if (persistenceMode === 'local') {
      localStorage.setItem(`proof-sprint-v2-${clientId}`, JSON.stringify(state))
      return
    }

    const patch = proofSprintClientDataPatch(clientId, sanitizeSprintState(state), deliverableKey)

    try {
      const { error } = await (supabase as any).from('proof_sprint_client_data').upsert(patch, {
        onConflict: 'client_id,deliverable_key',
      })

      if (error) throw error
      localStorage.setItem(`proof-sprint-v2-${clientId}`, JSON.stringify(state))
    } catch {
      setPersistenceMode('local')
      localStorage.setItem(`proof-sprint-v2-${clientId}`, JSON.stringify(state))
    }
  }

  function applyServerResponse(deliverableKey: ProofSprintDeliverableKey, response: any) {
    if (!selectedClient) return
    const text = typeof response?.output === 'string'
      ? response.output
      : response?.row?.output_md || JSON.stringify(response?.row?.output_json ?? response?.output ?? {}, null, 2)
    const rowJson = response?.row?.output_json ?? (typeof response?.output === 'object' ? response.output : null)

    setClientStates(prev => {
      const current = prev[selectedClient.id] || createInitialState()
      const next = { ...current }

      switch (deliverableKey) {
        case 'D1': {
          const json = rowJson && typeof rowJson === 'object' ? rowJson : null
          next.d1 = {
            ...next.d1,
            transformationType: json?.transformation_type ?? next.d1.transformationType,
            buyingTrigger: json?.buying_trigger ?? next.d1.buyingTrigger,
            customerIntents: Array.isArray(json?.customer_intents) ? json.customer_intents.join('\n') : next.d1.customerIntents,
            competitorAngle: json?.dominant_competitor_angle ?? next.d1.competitorAngle,
            positioningGap: json?.positioning_gap ?? next.d1.positioningGap,
            dominantFormula: json?.positioning_formula ?? next.d1.dominantFormula,
            output: text,
          }
          break
        }
        case 'D2': next.d2 = { ...next.d2, output: text, exportLabels: Array.isArray(rowJson?.export_labels) ? rowJson.export_labels : next.d2.exportLabels }; break
        case 'D3': next.d3 = { ...next.d3, output: text, downloadLabels: Array.isArray(rowJson?.download_labels) ? rowJson.download_labels : next.d3.downloadLabels }; break
        case 'D4': next.d4 = { ...next.d4, output: text, guideTopic: rowJson?.guide_topic ?? next.d4.guideTopic, pdfCopy: rowJson?.pdf_copy ?? next.d4.pdfCopy, cta: rowJson?.cta ?? next.d4.cta, formFields: rowJson?.form_fields ?? next.d4.formFields }; break
        case 'D5': next.d5 = { ...next.d5, output: text, keywordTrigger: rowJson?.keyword_trigger ?? next.d5.keywordTrigger }; break
        case 'D6': next.d6 = { ...next.d6, output: text }; break
        case 'D7': next.d7 = { ...next.d7, output: text }; break
        case 'D8': next.d8 = { ...next.d8, output: text }; break
        case 'D9': next.d9 = { ...next.d9, output: text, lastServerResponse: response?.output ?? response?.row?.output_json ?? null }; break
        case 'D10': next.d10 = { ...next.d10, output: text }; break
        case 'D11': next.d11 = { ...next.d11, output: text }; break
        case 'D12': next.d12 = { ...next.d12, output: text }; break
        case 'D13': next.d13 = { ...next.d13, output: text }; break
        case 'D14': next.d14 = { ...next.d14, output: text }; break
        case 'D15': next.d15 = {
          ...next.d15,
          output: text,
          whatsappDeliveryMessage: rowJson?.delivery_message ?? next.d15.whatsappDeliveryMessage,
          portalLink: rowJson?.portal_link ?? next.d15.portalLink,
          creditApproved: Boolean(rowJson?.creditApproved ?? next.d15.creditApproved),
          engagementClosed: Boolean(rowJson?.engagementClosed ?? next.d15.engagementClosed),
        }
      }

      return { ...prev, [selectedClient.id]: next }
    })
  }

  function selectClient(client: ClientRow) {
    setSelectedClient(client)
    ensureClientState(client)
    setActiveTab(1)
  }

  const activeState = selectedClient ? clientStates[selectedClient.id] : null

  useEffect(() => {
    if (!selectedClient) return
    if (hydratedClientIdsRef.current.has(selectedClient.id)) return

    let cancelled = false
    setHydratingClientId(selectedClient.id)

    void (async () => {
      try {
        const hydrated = await loadPersistedClientState(selectedClient.id)
        if (cancelled) return
        setClientStates(prev => ({ ...prev, [selectedClient.id]: hydrated }))
        hydratedClientIdsRef.current.add(selectedClient.id)
      } catch {
        if (!cancelled) {
          setClientStates(prev => ({ ...prev, [selectedClient.id]: createInitialState() }))
        }
      } finally {
        if (!cancelled) setHydratingClientId(null)
      }
    })()

    return () => { cancelled = true }
  }, [selectedClient?.id])

  useEffect(() => {
    if (!selectedClient || !activeState) return
    if (hydratingClientId === selectedClient.id) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)

    saveTimerRef.current = window.setTimeout(() => {
      void saveClientState(selectedClient.id, TAB_TO_DELIVERABLE[activeTab] ?? 'D1', activeState).catch(() => null)
    }, 800)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [selectedClient?.id, activeTab, activeState])

  function updateActiveState(updater: (state: SprintV2State) => SprintV2State) {
    if (!selectedClient) return
    setClientStates(prev => {
      const current = prev[selectedClient.id] || createInitialState()
      return { ...prev, [selectedClient.id]: updater(current) }
    })
  }

  function updateD1(patch: Partial<D1State>) {
    updateActiveState(state => ({ ...state, d1: { ...state.d1, ...patch } }))
  }
  function updateD2(patch: Partial<D2State>) {
    updateActiveState(state => ({ ...state, d2: { ...state.d2, ...patch } }))
  }
  function updateD3(patch: Partial<D3State>) {
    updateActiveState(state => ({ ...state, d3: { ...state.d3, ...patch } }))
  }
  function updateD4(patch: Partial<D4State>) {
    updateActiveState(state => ({ ...state, d4: { ...state.d4, ...patch } }))
  }
  function updateD5(patch: Partial<D5State>) {
    updateActiveState(state => ({ ...state, d5: { ...state.d5, ...patch } }))
  }
  function updateD6(patch: Partial<D6State>) {
    updateActiveState(state => ({ ...state, d6: { ...state.d6, ...patch } }))
  }
  function updateD7(patch: Partial<D7State>) {
    updateActiveState(state => ({ ...state, d7: { ...state.d7, ...patch } }))
  }
  function updateD8(patch: Partial<D8State>) {
    updateActiveState(state => ({ ...state, d8: { ...state.d8, ...patch } }))
  }

  function updatePhase2(tabKey: 'd9' | 'd10' | 'd11' | 'd12' | 'd13' | 'd14' | 'd15', patch: Phase2State) {
    updateActiveState(state => ({
      ...state,
      [tabKey]: { ...state[tabKey], ...patch },
    }))
  }

  async function persistProofSprintDeliverable(deliverableKey: ProofSprintDeliverableKey) {
    if (!selectedClient || !activeState) return null
    try {
      await saveClientState(selectedClient.id, deliverableKey, activeState)
    } catch (error) {
      toast(`Local save failed for ${deliverableKey}: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }
    const { data, error } = await supabase.functions.invoke('proof-sprint-run-deliverable', {
      body: {
        client_id: selectedClient.id,
        deliverable_key: deliverableKey,
        input_json: sanitizeSprintState(activeState),
      },
    })

    if (error) {
      toast(`Backend sync failed for ${deliverableKey}: ${error.message}`, 'error')
      return null
    }

    if (data) applyServerResponse(deliverableKey, data)

    return data
  }

  async function uploadAsset(category: AssetCategoryKey, fileList: FileList | null) {
    if (!selectedClient || !fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    const nextAssets: UploadedAsset[] = []

    for (const file of files) {
      const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
      const path = `proof-sprint-v2/${selectedClient.id}/${category}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('aa-assets').upload(path, file, { upsert: true })
      if (error) {
        toast(`Upload failed for ${file.name}: ${error.message}`, 'error')
        continue
      }
      const { data } = supabase.storage.from('aa-assets').getPublicUrl(path)
      nextAssets.push({ name: file.name, path, url: data.publicUrl, uploadedAt: new Date().toISOString() })
    }

    if (nextAssets.length > 0) {
      updateD1({
        assets: {
          ...activeState!.d1.assets,
          [category]: [...activeState!.d1.assets[category], ...nextAssets],
        },
      })
      toast(`${nextAssets.length} file(s) uploaded to ${category.replace(/([A-Z])/g, ' $1').trim()}`)
    }
  }

  function toggleAssetSelection(path: string) {
    if (!activeState) return
    const current = activeState.d2.selectedAssets
    updateD2({
      selectedAssets: current.includes(path)
        ? current.filter(item => item !== path)
        : [...current, path],
    })
  }

  function testApp(appKey: AppKey) {
    if (!activeState) return
    const app = activeState.d1.apps[appKey]
    if (!app.enabled || !app.apiKey || !app.secret) {
      updateD1({
        apps: {
          ...activeState.d1.apps,
          [appKey]: { ...app, testStatus: 'missing' },
        },
      })
      toast(`Add credentials for ${APP_DEFS.find(a => a.key === appKey)?.label}`, 'error')
      return
    }

    updateD1({
      apps: {
        ...activeState.d1.apps,
        [appKey]: { ...app, testStatus: 'connected' },
      },
    })
    toast(`${APP_DEFS.find(a => a.key === appKey)?.label} test passed ✓`)
  }

  async function generateD1() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D1')
    toast('Deliverable 1 generated ✓')
  }

  async function generateD2() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D2')
    toast('Deliverable 2 generated ✓')
  }

  async function generateD3() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D3')
    toast('Deliverable 3 generated ✓')
  }

  async function generateD4() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D4')
    toast('Deliverable 4 generated ✓')
  }

  async function generateD5() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D5')
    toast('Deliverable 5 generated ✓')
  }

  async function generateD6() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D6')
    toast('Deliverable 6 generated ✓')
  }

  async function generateD7() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D7')
    toast('Deliverable 7 generated ✓')
  }

  async function generateD8() {
    if (!selectedClient || !activeState) return
    await persistProofSprintDeliverable('D8')
    toast('Deliverable 8 generated ✓')
  }

  function renderPhase2Deliverable(tabId: number) {
    if (!selectedClient || !activeState) return null

    switch (tabId) {
      case 9: {
        const appRows = [
          ['connectedMetaGraphApi', 'Meta Graph API'],
          ['connectedOpenClaw', 'OpenClaw'],
          ['connectedAaDashboard', 'AA Dashboard'],
          ['connectedNCronScheduler', 'n8n Cron Scheduler'],
        ] as const
        return (
          <>
            <Panel title="Inputs" subtitle="Connect the daily metrics stack and define the automation rules.">
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Daily schedule">
                    <input className="input" value={activeState.d9.schedule} onChange={e => updatePhase2('d9', { schedule: e.target.value })} placeholder="08:00 SAST" />
                  </Field>
                  <Field label="Metrics pull">
                    <input className="input" value={activeState.d9.metricsToPull} onChange={e => updatePhase2('d9', { metricsToPull: e.target.value })} placeholder="Spend, CPM, CTR..." />
                  </Field>
                </div>
                <Field label="Connected apps">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {appRows.map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                        <input type="checkbox" checked={(activeState.d9 as Phase2State)[key]} onChange={e => updatePhase2('d9', { [key]: e.target.checked } as Phase2State)} />
                        <span style={{ fontSize: 12 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Alert thresholds">
                  <textarea className="input" rows={4} value={activeState.d9.alertThresholds} onChange={e => updatePhase2('d9', { alertThresholds: e.target.value })} placeholder="Kill / scale rules..." />
                </Field>
              </div>
            </Panel>
            <Panel title="Action" subtitle="Generate the mostly automatic daily metrics engine and alert spec.">
              <button className="btn-primary" onClick={() => {
                const connected = {
                  connectedMetaGraphApi: true,
                  connectedOpenClaw: true,
                  connectedAaDashboard: true,
                  connectedNCronScheduler: true,
                }
                const output = `# Daily Sprint Metrics Engine\n\n**Client:** ${selectedClient.business_name}\n**Schedule:** ${activeState.d9.schedule}\n\n## automation stack\n- Meta Graph API\n- OpenClaw\n- AA Dashboard\n- n8n Cron Scheduler\n\n## metrics pulled\n${activeState.d9.metricsToPull}\n\n## alert thresholds\n${activeState.d9.alertThresholds}\n\n## operating mode\nMostly automatic. Human review only when an alert fires or the daily log breaks.`
                updatePhase2('d9', { ...connected, firstSuccessfulLog: true, output })
                void persistProofSprintDeliverable('D9')
                toast('Deliverable 9 generated ✓')
              }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} /> Generate Daily Metrics Engine
              </button>
            </Panel>
            <Panel title="Outputs" subtitle="Daily log, alert thresholds, and automation notes.">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d9.output || 'Generate the daily metrics engine to see the output.'}</pre>
              <CompletionNotice complete={currentStepComplete(9)} nextLabel="Deliverable 10" />
            </Panel>
          </>
        )
      }
      case 10: {
        return (
          <>
            <Panel title="Inputs" subtitle="Capture day 1, 2, and 3 performance before the sprint stabilisation call.">
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Day 1 log"><textarea className="input" rows={4} value={activeState.d10.day1Log} onChange={e => updatePhase2('d10', { day1Log: e.target.value })} /></Field>
                  <Field label="Day 2 log"><textarea className="input" rows={4} value={activeState.d10.day2Log} onChange={e => updatePhase2('d10', { day2Log: e.target.value })} /></Field>
                  <Field label="Day 3 log"><textarea className="input" rows={4} value={activeState.d10.day3Log} onChange={e => updatePhase2('d10', { day3Log: e.target.value })} /></Field>
                </div>
                <Field label="Stability notes">
                  <textarea className="input" rows={5} value={activeState.d10.stabilityDecision} onChange={e => updatePhase2('d10', { stabilityDecision: e.target.value })} placeholder="What stabilised, what is still noisy, what gets fixed next..." />
                </Field>
              </div>
            </Panel>
            <Panel title="Action" subtitle="Generate the stabilisation report and decision note.">
              <button className="btn-primary" onClick={() => {
                const output = `# Day 3 Stabilisation Protocol\n\n**Client:** ${selectedClient.business_name}\n\n## three-day snapshot\n- Day 1: ${activeState.d10.day1Log || 'Log the first day.'}\n- Day 2: ${activeState.d10.day2Log || 'Log the second day.'}\n- Day 3: ${activeState.d10.day3Log || 'Log the third day.'}\n\n## stability decision\n${activeState.d10.stabilityDecision || 'Stabilise the winning signals and cut the noise.'}\n\n## recommendation\nContinue. The sprint is stable enough to move into optimisation.`
                updatePhase2('d10', { stabilityDecision: activeState.d10.stabilityDecision || 'Stabilise the winning signals and cut the noise.', stableApproved: true, output })
                void persistProofSprintDeliverable('D10')
                toast('Deliverable 10 generated ✓')
              }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} /> Generate Stabilisation Report
              </button>
            </Panel>
            <Panel title="Outputs" subtitle="Stability summary and next-step recommendation.">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d10.output || 'Generate the stabilisation report to see the output.'}</pre>
              <CompletionNotice complete={currentStepComplete(10)} nextLabel="Deliverable 11" />
            </Panel>
          </>
        )
      }
      case 11: {
        return (
          <>
            <Panel title="Inputs" subtitle="Optimize the winners and log the action list for the next sprint block.">
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Days 1-3 performance">
                  <textarea className="input" rows={4} value={activeState.d11.days13Performance} onChange={e => updatePhase2('d11', { days13Performance: e.target.value })} placeholder="What happened across the first 3 days..." />
                </Field>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ['pauseWeakAdSets', 'Pause weak ad sets'],
                    ['increaseWinners', 'Increase winners'],
                    ['swapLowCtrCreatives', 'Swap low CTR creatives'],
                    ['adjustBudgets', 'Adjust budgets'],
                    ['fixAudienceOverlaps', 'Fix audience overlaps'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                      <input type="checkbox" checked={(activeState.d11 as Phase2State)[key]} onChange={e => updatePhase2('d11', { [key]: e.target.checked } as Phase2State)} />
                      <span style={{ fontSize: 12 }}>{label}</span>
                    </label>
                  ))}
                </div>
                <Field label="SLA timer">
                  <input className="input" value={activeState.d11.slaTimer} onChange={e => updatePhase2('d11', { slaTimer: e.target.value })} placeholder="2 hours" />
                </Field>
              </div>
            </Panel>
            <Panel title="Action" subtitle="Generate the optimisation report and action sheet.">
              <button className="btn-primary" onClick={() => {
                const output = `# Day 4 Optimisation Report\n\n**Client:** ${selectedClient.business_name}\n\n## action sheet\n- Pause weak ad sets: ${activeState.d11.pauseWeakAdSets ? 'Yes' : 'No'}\n- Increase winners: ${activeState.d11.increaseWinners ? 'Yes' : 'No'}\n- Swap low CTR creatives: ${activeState.d11.swapLowCtrCreatives ? 'Yes' : 'No'}\n- Adjust budgets: ${activeState.d11.adjustBudgets ? 'Yes' : 'No'}\n- Fix audience overlaps: ${activeState.d11.fixAudienceOverlaps ? 'Yes' : 'No'}\n\n## notes\n${activeState.d11.days13Performance || 'Capture the first three days of data.'}\n\n## SLA\n${activeState.d11.slaTimer}\n\nOptimization is now the priority.`
                updatePhase2('d11', { completedAllActions: true, notesEntered: true, output })
                void persistProofSprintDeliverable('D11')
                toast('Deliverable 11 generated ✓')
              }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} /> Generate Optimisation Report
              </button>
            </Panel>
            <Panel title="Outputs" subtitle="Optimization sheet, SLA note, and recommended next actions.">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d11.output || 'Generate the optimisation report to see the output.'}</pre>
              <CompletionNotice complete={currentStepComplete(11)} nextLabel="Deliverable 12" />
            </Panel>
          </>
        )
      }
      case 12: {
        return (
          <>
            <Panel title="Inputs" subtitle="Prepare the day 7 client update with hard numbers and what happens next.">
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Days 1-7 data"><textarea className="input" rows={4} value={activeState.d12.days17Data} onChange={e => updatePhase2('d12', { days17Data: e.target.value })} /></Field>
                <Field label="Client reported leads/bookings"><textarea className="input" rows={4} value={activeState.d12.clientReportedLeadsBookings} onChange={e => updatePhase2('d12', { clientReportedLeadsBookings: e.target.value })} /></Field>
                <Field label="Update summary"><textarea className="input" rows={4} value={activeState.d12.progressUpdate} onChange={e => updatePhase2('d12', { progressUpdate: e.target.value })} placeholder="What is happening, what changed, what is next..." /></Field>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ['sendNow', 'Send now'],
                    ['editBeforeSend', 'Edit before send'],
                    ['logReplySentiment', 'Log reply sentiment'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                      <input type="checkbox" checked={(activeState.d12 as Phase2State)[key]} onChange={e => updatePhase2('d12', { [key]: e.target.checked } as Phase2State)} />
                      <span style={{ fontSize: 12 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="Action" subtitle="Generate the client WhatsApp update and internal summary.">
              <button className="btn-primary" onClick={() => {
                const output = `# Day 7 Mid-Sprint Client Update\n\n**Client:** ${selectedClient.business_name}\n\n## progress\n${activeState.d12.progressUpdate || 'Summarise progress so far.'}\n\n## wins so far\n${activeState.d12.winsSoFar || 'Capture the current wins.'}\n\n## activity summary\n${activeState.d12.activitySummary || 'Summarise ad and lead activity.'}\n\n## what happens next\n${activeState.d12.whatNext || 'Keep the winners live and tighten the weak points.'}\n\n## confidence line\n${activeState.d12.confidenceBuilderCta || 'We are tracking, learning, and accelerating the right signals.'}`
                updatePhase2('d12', { sendNow: true, editBeforeSend: true, logReplySentiment: true, output })
                void persistProofSprintDeliverable('D12')
                toast('Deliverable 12 generated ✓')
              }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} /> Generate Client Update
              </button>
            </Panel>
            <Panel title="Outputs" subtitle="WhatsApp-ready update plus internal summary.">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d12.output || 'Generate the client update to see the output.'}</pre>
              <CompletionNotice complete={currentStepComplete(12)} nextLabel="Deliverable 13" />
            </Panel>
          </>
        )
      }
      case 13: {
        return (
          <>
            <Panel title="Inputs" subtitle="Find the winning signals and prepare the acceleration move.">
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Days 1-7 full data"><textarea className="input" rows={4} value={activeState.d13.days17FullData} onChange={e => updatePhase2('d13', { days17FullData: e.target.value })} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Lowest CPM"><input className="input" value={activeState.d13.lowestCpm} onChange={e => updatePhase2('d13', { lowestCpm: e.target.value })} /></Field>
                  <Field label="Highest CTR"><input className="input" value={activeState.d13.highestCtr} onChange={e => updatePhase2('d13', { highestCtr: e.target.value })} /></Field>
                  <Field label="Best DM volume"><input className="input" value={activeState.d13.bestDmVolume} onChange={e => updatePhase2('d13', { bestDmVolume: e.target.value })} /></Field>
                  <Field label="Best CPL"><input className="input" value={activeState.d13.bestCpl} onChange={e => updatePhase2('d13', { bestCpl: e.target.value })} /></Field>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ['duplicateWinners', 'Duplicate winners'],
                    ['increaseBudgets', 'Increase budgets'],
                    ['pauseWeakAds', 'Pause weak ads'],
                    ['requestNewCreatives', 'Request new creatives'],
                    ['rebalanceSpend', 'Rebalance spend'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                      <input type="checkbox" checked={(activeState.d13 as Phase2State)[key]} onChange={e => updatePhase2('d13', { [key]: e.target.checked } as Phase2State)} />
                      <span style={{ fontSize: 12 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="Action" subtitle="Generate the acceleration phase plan.">
              <button className="btn-primary" onClick={() => {
                const output = `# Day 8 Acceleration Phase\n\n**Client:** ${selectedClient.business_name}\n\n## winners to scale\n- Lowest CPM: ${activeState.d13.lowestCpm || 'Fill in the lowest CPM signal.'}\n- Highest CTR: ${activeState.d13.highestCtr || 'Fill in the highest CTR signal.'}\n- Best DM volume: ${activeState.d13.bestDmVolume || 'Fill in the strongest DM volume.'}\n- Best CPL: ${activeState.d13.bestCpl || 'Fill in the lowest CPL.'}\n\n## acceleration move\nDuplicate winners, increase budgets, pause weak ads, request new creatives, and rebalance spend.`
                updatePhase2('d13', { actionsCompleted: true, output })
                void persistProofSprintDeliverable('D13')
                toast('Deliverable 13 generated ✓')
              }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} /> Generate Acceleration Plan
              </button>
            </Panel>
            <Panel title="Outputs" subtitle="Winner expansion, budget shifts, and creative requests.">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d13.output || 'Generate the acceleration plan to see the output.'}</pre>
              <CompletionNotice complete={currentStepComplete(13)} nextLabel="Deliverable 14" />
            </Panel>
          </>
        )
      }
      case 14: {
        return (
          <>
            <Panel title="Inputs" subtitle="Lock the full 14-day totals before final closeout.">
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="All 14-day totals"><textarea className="input" rows={4} value={activeState.d14.all14DayTotals} onChange={e => updatePhase2('d14', { all14DayTotals: e.target.value })} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Spend"><input className="input" value={activeState.d14.spend} onChange={e => updatePhase2('d14', { spend: e.target.value })} /></Field>
                  <Field label="Leads"><input className="input" value={activeState.d14.leads} onChange={e => updatePhase2('d14', { leads: e.target.value })} /></Field>
                  <Field label="DMs"><input className="input" value={activeState.d14.dms} onChange={e => updatePhase2('d14', { dms: e.target.value })} /></Field>
                  <Field label="Bookings"><input className="input" value={activeState.d14.bookings} onChange={e => updatePhase2('d14', { bookings: e.target.value })} /></Field>
                  <Field label="Revenue"><input className="input" value={activeState.d14.revenue} onChange={e => updatePhase2('d14', { revenue: e.target.value })} /></Field>
                  <Field label="ROAS proxy"><input className="input" value={activeState.d14.roasProxy} onChange={e => updatePhase2('d14', { roasProxy: e.target.value })} /></Field>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ['appointmentsBookedConfirmed', 'Appointments booked'],
                    ['dealsClosedConfirmed', 'Deals closed'],
                    ['revenueCollectedConfirmed', 'Revenue collected'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                      <input type="checkbox" checked={(activeState.d14 as Phase2State)[key]} onChange={e => updatePhase2('d14', { [key]: e.target.checked } as Phase2State)} />
                      <span style={{ fontSize: 12 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="Action" subtitle="Generate the final data lock sheet.">
              <button className="btn-primary" onClick={() => {
                const output = `# Day 13 Final Data Lock\n\n**Client:** ${selectedClient.business_name}\n\n## locked totals\n${activeState.d14.all14DayTotals || 'Lock the totals here.'}\n\n## recommended summary\n- Spend: ${activeState.d14.spend || '—'}\n- Leads: ${activeState.d14.leads || '—'}\n- DMs: ${activeState.d14.dms || '—'}\n- Bookings: ${activeState.d14.bookings || '—'}\n- Revenue: ${activeState.d14.revenue || '—'}\n\n## best and worst\n- Best ad: ${activeState.d14.bestAd || '—'}\n- Worst ad: ${activeState.d14.worstAd || '—'}\n- Best audience: ${activeState.d14.bestAudience || '—'}`
                updatePhase2('d14', { appointmentsBookedConfirmed: true, dealsClosedConfirmed: true, revenueCollectedConfirmed: true, output })
                void persistProofSprintDeliverable('D14')
                toast('Deliverable 14 generated ✓')
              }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} /> Generate Data Lock Sheet
              </button>
            </Panel>
            <Panel title="Outputs" subtitle="Final totals ready for closeout.">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d14.output || 'Generate the final data lock to see the output.'}</pre>
              <CompletionNotice complete={currentStepComplete(14)} nextLabel="Deliverable 15" />
            </Panel>
          </>
        )
      }
      case 15: {
        return (
          <>
            <Panel title="Inputs" subtitle="Assemble the demand proof closeout and final delivery pack.">
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Dataset"><textarea className="input" rows={4} value={activeState.d15.dataset} onChange={e => updatePhase2('d15', { dataset: e.target.value })} /></Field>
                <Field label="Positioning formula"><input className="input" value={activeState.d15.positioningFormula} onChange={e => updatePhase2('d15', { positioningFormula: e.target.value })} /></Field>
                <Field label="Sprint logs"><textarea className="input" rows={4} value={activeState.d15.sprintLogs} onChange={e => updatePhase2('d15', { sprintLogs: e.target.value })} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Demand result"><input className="input" value={activeState.d15.demandResult} onChange={e => updatePhase2('d15', { demandResult: e.target.value })} /></Field>
                  <Field label="Portal link"><input className="input" value={activeState.d15.portalLink} onChange={e => updatePhase2('d15', { portalLink: e.target.value })} placeholder="Client portal delivery link" /></Field>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ['creditApproved', 'R2,500 credit approved'],
                    ['engagementClosed', 'Engagement closed'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                      <input type="checkbox" checked={(activeState.d15 as Phase2State)[key]} onChange={e => updatePhase2('d15', { [key]: e.target.checked } as Phase2State)} />
                      <span style={{ fontSize: 12 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="Action" subtitle="Generate the demand proof closeout and delivery message.">
              <button className="btn-primary" onClick={() => {
                const output = `# Demand Proof Document\n\n**Client:** ${selectedClient.business_name}\n\n## closeout\n${activeState.d15.dataset || 'Compile the final dataset here.'}\n\n## positioning formula\n${activeState.d15.positioningFormula || 'Proof × Volume × Consistency = Brand'}\n\n## sprint logs\n${activeState.d15.sprintLogs || 'Add the sprint notes here.'}\n\n## demand result\n${activeState.d15.demandResult}\n\nMostly automatic closeout, final delivery pack ready for portal and WhatsApp.`
                updatePhase2('d15', { whatsappDeliveryMessage: `Your demand proof closeout is ready for ${selectedClient.business_name}.`, creditApproved: true, engagementClosed: true, output })
                void persistProofSprintDeliverable('D15')
                toast('Deliverable 15 generated ✓')
              }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} /> Generate Demand Proof Closeout
              </button>
            </Panel>
            <Panel title="Outputs" subtitle="Final closeout document, portal delivery, and WhatsApp message.">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d15.output || 'Generate the demand proof closeout to see the output.'}</pre>
              <CompletionNotice complete={currentStepComplete(15)} nextLabel="Process complete" />
            </Panel>
          </>
        )
      }
      default:
        return null
    }
  }

  const activeAssetsCount = activeState ? Object.values(activeState.d1.assets).flat().length : 0
  const connectedAppsCount = activeState ? Object.values(activeState.d1.apps).filter(app => app.enabled && app.testStatus === 'connected').length : 0
  const completedTabs = activeState ? TAB_DEFS.filter(tab => {
    switch (tab.id) {
      case 1: return !!activeState.d1.transcript.trim() && activeAssetsCount > 0 && !!activeState.d1.output.trim() && !!activeState.d1.sprintGoLiveDate.trim() && !!activeState.d1.clientWhatsapp.trim() && !!activeState.d1.operatorWhatsapp.trim()
      case 2: return !!activeState.d2.output.trim()
      case 3: return !!activeState.d3.output.trim()
      case 4: return !!activeState.d4.output.trim()
      case 5: return !!activeState.d5.output.trim()
      case 6: return !!activeState.d6.output.trim()
      case 7: return !!activeState.d7.output.trim()
      case 8: return !!activeState.d8.output.trim()
      case 9: return !!activeState.d9.output.trim() && activeState.d9.firstSuccessfulLog
      case 10: return !!activeState.d10.output.trim() && !!activeState.d10.stabilityDecision.trim() && activeState.d10.stableApproved
      case 11: return !!activeState.d11.output.trim() && activeState.d11.completedAllActions && activeState.d11.notesEntered
      case 12: return !!activeState.d12.output.trim() && (activeState.d12.sendNow || activeState.d12.editBeforeSend)
      case 13: return !!activeState.d13.output.trim() && activeState.d13.actionsCompleted
      case 14: return !!activeState.d14.output.trim() && activeState.d14.appointmentsBookedConfirmed && activeState.d14.revenueCollectedConfirmed
      case 15: return !!activeState.d15.output.trim() && activeState.d15.engagementClosed && activeState.d15.creditApproved
      default: return false
    }
  }).length : 0
  const progressPct = Math.round((completedTabs / TAB_DEFS.length) * 100)

  const allAssets = activeState ? Object.values(activeState.d1.assets).flat() : []
  const currentStepComplete = (tabId: number) => {
    if (!activeState) return false
    switch (tabId) {
      case 1: return !!activeState.d1.transcript.trim() && activeAssetsCount > 0 && !!activeState.d1.output.trim() && !!activeState.d1.sprintGoLiveDate.trim() && !!activeState.d1.clientWhatsapp.trim() && !!activeState.d1.operatorWhatsapp.trim()
      case 2: return !!activeState.d2.output.trim() && !!activeState.d2.topObjection.trim()
      case 3: return !!activeState.d3.output.trim() && !!activeState.d3.brandColors.trim()
      case 4: return !!activeState.d4.output.trim() && !!activeState.d4.vertical.trim()
      case 5: return !!activeState.d5.output.trim() && !!activeState.d5.targeting.trim()
      case 6: return !!activeState.d6.output.trim() && !!activeState.d6.freshAudiences.trim()
      case 7: return !!activeState.d7.output.trim() && !!activeState.d7.welcome.trim()
      case 8: return !!activeState.d8.output.trim() && !!activeState.d8.keywordTrigger.trim()
      case 9: return !!activeState.d9.output.trim() && activeState.d9.firstSuccessfulLog && activeState.d9.connectedMetaGraphApi && activeState.d9.connectedOpenClaw && activeState.d9.connectedAaDashboard && activeState.d9.connectedNCronScheduler
      case 10: return !!activeState.d10.output.trim() && !!activeState.d10.stabilityDecision.trim() && activeState.d10.stableApproved
      case 11: return !!activeState.d11.output.trim() && activeState.d11.completedAllActions && activeState.d11.notesEntered
      case 12: return !!activeState.d12.output.trim() && (activeState.d12.sendNow || activeState.d12.editBeforeSend) && activeState.d12.logReplySentiment
      case 13: return !!activeState.d13.output.trim() && activeState.d13.actionsCompleted
      case 14: return !!activeState.d14.output.trim() && activeState.d14.appointmentsBookedConfirmed && activeState.d14.dealsClosedConfirmed && activeState.d14.revenueCollectedConfirmed
      case 15: return !!activeState.d15.output.trim() && activeState.d15.engagementClosed && activeState.d15.creditApproved
      default: return false
    }
  }

  const phase2Unlocked = currentStepComplete(8)
  const phase2CompletedTabs = activeState ? TAB_DEFS.filter(tab => tab.id >= 9 && currentStepComplete(tab.id)).length : 0
  const phase2ProgressPct = Math.round((phase2CompletedTabs / 7) * 100)

  const isTabLocked = (tabId: number) => tabId > 1 && !currentStepComplete(tabId - 1)

  return (
    <div className="sprint-panel">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(0,229,195,0.08)', color: 'var(--teal)' }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Proof Sprint V2</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono' }}>Client-specific deliverables process</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 8 }}>
          <Stat label="Clients" value={clients.length} sub="Proof Sprint tier" />
          <Stat label="Progress" value={`${progressPct}%`} sub={`${completedTabs}/${TAB_DEFS.length} deliverables complete`} />
          <Stat label="Assets" value={activeAssetsCount} sub="uploaded to Supabase" />
          <Stat label="Apps" value={connectedAppsCount} sub="connected and tested" />
        </div>

        <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, marginBottom: 4 }}>
          Client Selector
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey)', padding: 18 }}>
            <Loader2 className="spin" size={18} />
            <span style={{ fontSize: 12, fontFamily: 'DM Mono' }}>Loading clients...</span>
          </div>
        ) : clients.length === 0 ? (
          <div style={{ color: 'var(--grey2)', fontSize: 13, padding: 16, border: '1px dashed var(--border2)', borderRadius: 10 }}>
            No Proof Sprint clients found.
          </div>
        ) : (
          clients.map(client => (
            <button
              key={client.id}
              onClick={() => selectClient(client)}
              style={{
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                border: `1px solid ${selectedClient?.id === client.id ? 'var(--teal)' : 'var(--border2)'}`,
                background: selectedClient?.id === client.id ? 'var(--bg3)' : 'var(--bg2)',
                textAlign: 'left',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{client.business_name}</div>
                <div style={{ fontSize: 10, color: 'var(--grey2)', marginTop: 2 }}>{client.owner_name || 'Client'}</div>
              </div>
              <ChevronRight size={14} color={selectedClient?.id === client.id ? 'var(--teal)' : 'var(--border2)'} />
            </button>
          ))
        )}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {!selectedClient || !activeState ? (
          <div style={{ height: '100%', minHeight: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--grey2)', gap: 12 }}>
            <div style={{ padding: 20, borderRadius: '50%', background: 'var(--bg2)' }}>
              <ShieldCheck size={32} color="var(--teal)" />
            </div>
            <p style={{ fontSize: 13 }}>Select a Proof Sprint client to open the deliverables workspace.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--border2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontFamily: 'Playfair Display', fontWeight: 700 }}>{selectedClient.business_name}</div>
                  <div style={{ color: 'var(--teal)', fontSize: 11, fontFamily: 'DM Mono', marginTop: 4 }}>
                    PROOF SPRINT V2 · CLIENT DELIVERABLES
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      background: 'none', border: '1px solid var(--border2)', borderRadius: 6,
                      cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    <ExternalLink size={11} /> Process Guide
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--teal)', fontFamily: 'DM Mono', lineHeight: 1 }}>{progressPct}%</div>
                    <div style={{ fontSize: 10, color: 'var(--grey)', fontFamily: 'DM Mono', marginTop: 4 }}>
                      {completedTabs} / {TAB_DEFS.length} DELIVERABLES
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal-dark), var(--teal))', borderRadius: 99 }} />
              </div>
              {hydratingClientId === selectedClient.id && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono' }}>
                  Restoring saved sprint state from Supabase...
                </div>
              )}
            </div>

            {phase2Unlocked && (
              <Panel title="Phase 2 Dashboard" subtitle="Mostly automatic after Deliverable 8, with daily metrics, alerts, and closeout timing.">
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                    <Mini label="Mode" value="Mostly automatic" />
                    <Mini label="Phase 2" value={`${phase2CompletedTabs}/7 complete`} />
                    <Mini label="Alerts" value={activeState.d9.alertThresholds || 'Kill / scale thresholds'} />
                    <Mini label="Timeline" value="Day 1 → Day 14, then closeout" />
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${phase2ProgressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--amber), var(--teal))', borderRadius: 99 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
                    {[9, 10, 11, 12, 13, 14, 15].map(tabId => (
                      <div key={tabId} style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 10, background: currentStepComplete(tabId) ? 'rgba(0,229,195,0.06)' : 'var(--bg)' }}>
                        <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey2)', marginBottom: 4 }}>D{tabId}</div>
                        <div style={{ fontSize: 12, color: 'var(--white)', lineHeight: 1.4 }}>{TAB_DEFS.find(tab => tab.id === tabId)?.short}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
              {TAB_DEFS.map(tab => (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  locked={isTabLocked(tab.id)}
                  complete={currentStepComplete(tab.id)}
                  title={tab.title}
                  short={tab.short}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {activeTab === 1 && (
                <>
                  <Panel
                    title="A. Transcript Input"
                    subtitle="Paste the meeting transcript from the transcriber AI. This drives the intelligence document."
                  >
                    <textarea
                      className="input"
                      rows={10}
                      value={activeState.d1.transcript}
                      onChange={e => updateD1({ transcript: e.target.value })}
                      placeholder="Paste meeting transcript here..."
                      style={{ resize: 'vertical', lineHeight: 1.65 }}
                    />
                  </Panel>

                  <Panel
                    title="A0. Business Inputs"
                    subtitle="These fields feed the positioning prompt, ad prompts, and the downstream campaign specs."
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Location"><input className="input" value={activeState.d1.location} onChange={e => updateD1({ location: e.target.value })} placeholder="Cape Town" /></Field>
                      <Field label="Radius (km)"><input className="input" value={activeState.d1.radiusKm} onChange={e => updateD1({ radiusKm: e.target.value })} placeholder="25" /></Field>
                      <Field label="Service vertical"><input className="input" value={activeState.d1.serviceVertical} onChange={e => updateD1({ serviceVertical: e.target.value })} placeholder="Plumbing, landscaping, detailing..." /></Field>
                      <Field label="Primary service"><input className="input" value={activeState.d1.service1} onChange={e => updateD1({ service1: e.target.value })} placeholder="Main service" /></Field>
                      <Field label="Secondary service 1"><input className="input" value={activeState.d1.service2} onChange={e => updateD1({ service2: e.target.value })} placeholder="Optional" /></Field>
                      <Field label="Secondary service 2"><input className="input" value={activeState.d1.service3} onChange={e => updateD1({ service3: e.target.value })} placeholder="Optional" /></Field>
                      <Field label="Average job value"><input className="input" value={activeState.d1.averageJobValue} onChange={e => updateD1({ averageJobValue: e.target.value })} placeholder="15000" /></Field>
                      <Field label="Unique selling points"><textarea className="input" rows={4} value={activeState.d1.uspList} onChange={e => updateD1({ uspList: e.target.value })} placeholder="Fast turnaround, guaranteed quality..." /></Field>
                      <Field label="Social profiles"><textarea className="input" rows={4} value={activeState.d1.socialLinks} onChange={e => updateD1({ socialLinks: e.target.value })} placeholder="Instagram, Facebook, website URLs" /></Field>
                      <Field label="Testimonials"><textarea className="input" rows={4} value={activeState.d1.testimonials} onChange={e => updateD1({ testimonials: e.target.value })} placeholder="Paste short reviews or quotes" /></Field>
                      <Field label="Promotions / guarantees"><textarea className="input" rows={4} value={activeState.d1.promotions} onChange={e => updateD1({ promotions: e.target.value })} placeholder="Any offer, guarantee, or promo" /></Field>
                    </div>
                  </Panel>

                  <Panel
                    title="A1. Sprint Setup"
                    subtitle="These fields keep the delivery engine wired to the right Meta, WhatsApp, and OpenClaw targets."
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Sprint go-live date">
                        <input className="input" type="date" value={activeState.d1.sprintGoLiveDate} onChange={e => updateD1({ sprintGoLiveDate: e.target.value })} />
                      </Field>
                      <Field label="Client WhatsApp">
                        <input className="input" value={activeState.d1.clientWhatsapp} onChange={e => updateD1({ clientWhatsapp: e.target.value })} placeholder="+27..." />
                      </Field>
                      <Field label="Operator WhatsApp">
                        <input className="input" value={activeState.d1.operatorWhatsapp} onChange={e => updateD1({ operatorWhatsapp: e.target.value })} placeholder="+27..." />
                      </Field>
                      <Field label="Campaign 1 ID">
                        <input className="input" value={activeState.d1.c1CampaignId} onChange={e => updateD1({ c1CampaignId: e.target.value })} placeholder="Meta campaign id" />
                      </Field>
                      <Field label="Campaign 2 ID">
                        <input className="input" value={activeState.d1.c2CampaignId} onChange={e => updateD1({ c2CampaignId: e.target.value })} placeholder="Meta campaign id" />
                      </Field>
                      <Field label="OpenClaw agent id">
                        <input className="input" value={activeState.d1.openclawAgentId} onChange={e => updateD1({ openclawAgentId: e.target.value })} placeholder="agent_..." />
                      </Field>
                      <Field label="Meta secret ref (agent-side)">
                        <input className="input" value={activeState.d1.metaAccessTokenRef} onChange={e => updateD1({ metaAccessTokenRef: e.target.value })} placeholder="vault ref or env name" />
                      </Field>
                      <Field label="Telegram bot token">
                        <input className="input" type="password" value={activeState.d1.telegramBotToken} onChange={e => updateD1({ telegramBotToken: e.target.value })} placeholder="telegram bot token" />
                      </Field>
                      <Field label="Telegram chat id">
                        <input className="input" value={activeState.d1.telegramChatId} onChange={e => updateD1({ telegramChatId: e.target.value })} placeholder="telegram chat id" />
                      </Field>
                    </div>
                  </Panel>

                  <Panel
                    title="B. Asset Upload"
                    subtitle="Upload all proof assets into Supabase buckets, then build the sprint intelligence around them."
                  >
                    <div style={{ display: 'grid', gap: 12 }}>
                      {ASSET_CATEGORIES.map(category => (
                        <div key={category.key} style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 12, background: 'var(--bg)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{category.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4, lineHeight: 1.5 }}>{category.hint}</div>
                            </div>
                            <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)' }}>
                              {activeState.d1.assets[category.key].length} files
                            </div>
                          </div>
                          <input
                            className="input"
                            type="file"
                            accept={category.accept}
                            multiple
                            onChange={e => uploadAsset(category.key, e.target.files)}
                          />
                          {activeState.d1.assets[category.key].length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {activeState.d1.assets[category.key].map(asset => (
                                <div key={asset.path} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,229,195,0.04)', border: '1px solid rgba(0,229,195,0.16)' }}>
                                  <span style={{ fontSize: 12, color: 'var(--white)' }}>{asset.name}</span>
                                  <a href={asset.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--teal)' }}>Open</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel
                    title="C. Connected Apps Checklist"
                    subtitle="Toggle the integrations, add keys, and run a connection test for each app."
                  >
                    <div style={{ display: 'grid', gap: 10 }}>
                      {APP_DEFS.map(app => {
                        const appState = activeState.d1.apps[app.key]
                        const badgeColor = appState.testStatus === 'connected' ? 'var(--teal)' : appState.testStatus === 'missing' ? 'var(--amber)' : 'var(--grey2)'
                        return (
                          <div key={app.key} style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 12, background: 'var(--bg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}>
                                <input
                                  type="checkbox"
                                  checked={appState.enabled}
                                  onChange={e => updateD1({ apps: { ...activeState.d1.apps, [app.key]: { ...appState, enabled: e.target.checked } } })}
                                />
                                {app.label}
                              </label>
                              <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: badgeColor, textTransform: 'uppercase' }}>
                                {appState.testStatus === 'idle' ? 'Not tested' : appState.testStatus}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 }}>
                              <input
                                className="input"
                                placeholder="API Key"
                                value={appState.apiKey}
                                onChange={e => updateD1({ apps: { ...activeState.d1.apps, [app.key]: { ...appState, apiKey: e.target.value } } })}
                                disabled={!appState.enabled}
                              />
                              <input
                                className="input"
                                placeholder="Secret"
                                value={appState.secret}
                                onChange={e => updateD1({ apps: { ...activeState.d1.apps, [app.key]: { ...appState, secret: e.target.value } } })}
                                disabled={!appState.enabled}
                              />
                              <button className="btn-primary" onClick={() => testApp(app.key)} disabled={!appState.enabled}>
                                Test
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Panel>

                  <Panel
                    title="D. Generate Button"
                    subtitle="Build the Business Intelligence & Positioning Document once the inputs are in place."
                  >
                    <button className="btn-primary" onClick={generateD1} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Build Business Intelligence & Positioning Document
                    </button>
                  </Panel>

                  <Panel
                    title="E. Output Panel"
                    subtitle="Rendered markdown result. This unlocks Deliverable 2 when transcript, assets, and output are present."
                  >
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                        <Mini label="Transformation" value={activeState.d1.transformationType || '—'} />
                        <Mini label="Buying Trigger" value={activeState.d1.buyingTrigger || '—'} />
                        <Mini label="Customer Intents" value={activeState.d1.customerIntents ? 'Captured' : '—'} />
                        <Mini label="Formula" value={activeState.d1.dominantFormula || '—'} />
                      </div>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7, color: 'var(--white)' }}>
                        {activeState.d1.output || 'Press the build button to render the markdown result.'}
                      </pre>
                      <CompletionNotice complete={currentStepComplete(1)} nextLabel="Deliverable 2" />
                    </div>
                  </Panel>
                </>
              )}

              {activeTab === 2 && (
                <>
                  <Panel title="Inputs" subtitle="Use the positioning formula from D1, the uploaded images, and the top objection.">
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Positioning formula from D1">
                          <div className="input" style={{ minHeight: 44, display: 'flex', alignItems: 'center', color: 'var(--teal)' }}>{activeState.d1.dominantFormula || 'Generate Deliverable 1 first.'}</div>
                        </Field>
                        <Field label="Top objection">
                          <input className="input" value={activeState.d2.topObjection} onChange={e => updateD2({ topObjection: e.target.value })} placeholder="e.g. I need to think about it" />
                        </Field>
                      </div>

                      <Field label="Uploaded images">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {allAssets.length === 0 ? (
                            <div style={{ color: 'var(--grey)', fontSize: 13 }}>Upload proof images in Deliverable 1 first.</div>
                          ) : allAssets.map(asset => (
                            <button
                              key={asset.path}
                              onClick={() => toggleAssetSelection(asset.path)}
                              style={{
                                border: `1px solid ${activeState.d2.selectedAssets.includes(asset.path) ? 'var(--teal)' : 'var(--border2)'}`,
                                background: activeState.d2.selectedAssets.includes(asset.path) ? 'rgba(0,229,195,0.08)' : 'var(--bg2)',
                                color: 'var(--white)',
                                padding: '8px 10px',
                                borderRadius: 999,
                                cursor: 'pointer',
                                fontSize: 11,
                              }}
                            >
                              {asset.name}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </Panel>

                  <Panel title="Action" subtitle="Generate the proof carousel copy and export labels.">
                    <button className="btn-primary" onClick={generateD2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Proof Carousel Copy
                    </button>
                  </Panel>

                  <Panel title="Outputs" subtitle="3 headline variants, 3 CTA variants, 3 subtext variants, plus asset labels.">
                    <div style={{ display: 'grid', gap: 12 }}>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d2.output || 'Generate the carousel copy to see the output.'}</pre>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {activeState.d2.exportLabels.map(label => (
                          <span key={label} style={{ border: '1px solid var(--border2)', borderRadius: 999, padding: '5px 10px', fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono' }}>{label}</span>
                        ))}
                      </div>
                      <CompletionNotice complete={currentStepComplete(2)} nextLabel="Deliverable 3" />
                    </div>
                  </Panel>
                </>
              )}

              {activeTab === 3 && (
                <>
                  <Panel title="Inputs" subtitle="Use the D1 intelligence, uploaded images, and brand colors.">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="D1 intelligence">
                        <div className="input" style={{ minHeight: 120, whiteSpace: 'pre-wrap', color: 'var(--grey2)', overflow: 'auto' }}>{activeState.d1.output || 'Generate Deliverable 1 first.'}</div>
                      </Field>
                      <Field label="Brand colors">
                        <textarea className="input" rows={5} value={activeState.d3.brandColors} onChange={e => updateD3({ brandColors: e.target.value })} placeholder="#6A00F4, #9D4BFF, #EBD7FF" />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate pain-based, outcome-based, and offer-based ad prompts and push them to AdCreative.ai.">
                    <button className="btn-primary" onClick={generateD3} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Push Prompts to AdCreative.ai
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Download creatives and label by campaign usage.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d3.output || 'Generate the ad variants to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(3)} nextLabel="Deliverable 4" />
                  </Panel>
                </>
              )}

              {activeTab === 4 && (
                <>
                  <Panel title="Inputs" subtitle="Vertical, buying trigger, and customer intents drive the lead magnet recommendation.">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Vertical">
                        <input className="input" value={activeState.d4.vertical} onChange={e => updateD4({ vertical: e.target.value })} placeholder="Plumbing, landscaping, detailing..." />
                      </Field>
                      <Field label="Buying trigger">
                        <input className="input" value={activeState.d4.buyingTrigger} onChange={e => updateD4({ buyingTrigger: e.target.value })} placeholder="Urgency, trust, price, speed..." />
                      </Field>
                      <Field label="Customer intents">
                        <textarea className="input" rows={4} value={activeState.d4.customerIntents} onChange={e => updateD4({ customerIntents: e.target.value })} placeholder="What the buyer is trying to solve..." />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the guide topic, full PDF copy, CTA, and Meta Instant Form schema.">
                    <button className="btn-primary" onClick={generateD4} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Lead Magnet
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Lead magnet markdown, PDF export, and form field schema.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d4.output || 'Generate the lead magnet to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(4)} nextLabel="Deliverable 5" />
                  </Panel>
                </>
              )}

              {activeTab === 5 && (
                <>
                  <Panel title="Inputs" subtitle="Define the conversion campaign structure.">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Targeting">
                        <textarea className="input" rows={4} value={activeState.d5.targeting} onChange={e => updateD5({ targeting: e.target.value })} placeholder="Local radius, interests, exclusions..." />
                      </Field>
                      <Field label="Age ranges">
                        <input className="input" value={activeState.d5.ageRanges} onChange={e => updateD5({ ageRanges: e.target.value })} placeholder="25-55" />
                      </Field>
                      <Field label="Exclusions">
                        <textarea className="input" rows={4} value={activeState.d5.exclusions} onChange={e => updateD5({ exclusions: e.target.value })} placeholder="Competitors, irrelevant buyers..." />
                      </Field>
                      <Field label="Budgets">
                        <input className="input" value={activeState.d5.budget} onChange={e => updateD5({ budget: e.target.value })} placeholder="Daily spend, scaling rule, cap..." />
                      </Field>
                      <Field label="Keyword trigger">
                        <input className="input" value={activeState.d5.keywordTrigger} onChange={e => updateD5({ keywordTrigger: e.target.value })} placeholder="e.g. PROOF" />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the full Campaign 1 build sheet.">
                    <button className="btn-primary" onClick={generateD5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Full Campaign Spec
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Targeting, age ranges, exclusions, budgets, keyword trigger, and ad set structure.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d5.output || 'Generate the conversion campaign spec to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(5)} nextLabel="Deliverable 6" />
                  </Panel>
                </>
              )}

              {activeTab === 6 && (
                <>
                  <Panel title="Inputs" subtitle="Define the leads campaign audience structure.">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Fresh audiences">
                        <textarea className="input" rows={4} value={activeState.d6.freshAudiences} onChange={e => updateD6({ freshAudiences: e.target.value })} placeholder="New audience pools..." />
                      </Field>
                      <Field label="Non converters">
                        <textarea className="input" rows={4} value={activeState.d6.nonConverters} onChange={e => updateD6({ nonConverters: e.target.value })} placeholder="Engaged but not converted..." />
                      </Field>
                      <Field label="Lookalike 3-5%">
                        <input className="input" value={activeState.d6.lookalike} onChange={e => updateD6({ lookalike: e.target.value })} placeholder="3-5% lookalike audience" />
                      </Field>
                      <Field label="Lead form setup">
                        <textarea className="input" rows={4} value={activeState.d6.leadFormSetup} onChange={e => updateD6({ leadFormSetup: e.target.value })} placeholder="Name, phone, service interest..." />
                      </Field>
                      <Field label="Budgets">
                        <input className="input" value={activeState.d6.budget} onChange={e => updateD6({ budget: e.target.value })} placeholder="Daily budget and scale rule" />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the Campaign 2 build sheet.">
                    <button className="btn-primary" onClick={generateD6} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Leads Campaign
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Fresh audiences, non-converters, lookalike 3-5%, lead form setup, and budgets.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d6.output || 'Generate the leads campaign spec to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(6)} nextLabel="Deliverable 7" />
                  </Panel>
                </>
              )}

              {activeTab === 7 && (
                <>
                  <Panel title="Inputs" subtitle="Generate the six-message sales flow and objection handling." >
                    <div style={{ display: 'grid', gap: 12 }}>
                      {[
                        ['welcome', 'Welcome'],
                        ['jobType', 'Job type'],
                        ['urgency', 'Urgency'],
                        ['area', 'Area'],
                        ['priceBridge', 'Price bridge'],
                        ['bookingClose', 'Booking close'],
                      ].map(([field, label]) => (
                        <Field key={field} label={label}>
                          <textarea
                            className="input"
                            rows={2}
                            value={(activeState.d7 as any)[field]}
                            onChange={e => updateD7({ [field]: e.target.value } as Partial<D7State>)}
                            placeholder={`${label} message...`}
                          />
                        </Field>
                      ))}
                      <Field label="Objection handler">
                        <textarea className="input" rows={3} value={activeState.d7.objectionHandler} onChange={e => updateD7({ objectionHandler: e.target.value })} placeholder="Handle the main objection..." />
                      </Field>
                      <Field label="Tyre kicker exit">
                        <textarea className="input" rows={3} value={activeState.d7.tyreKickerExit} onChange={e => updateD7({ tyreKickerExit: e.target.value })} placeholder="Polite exit for non-serious enquiries..." />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the 6-message sales flow." >
                    <button className="btn-primary" onClick={generateD7} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate WhatsApp DM Qualifier Script
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="6-message flow, objection handler, and tyre kicker exit.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d7.output || 'Generate the sales flow to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(7)} nextLabel="Deliverable 8" />
                  </Panel>
                </>
              )}

              {activeTab === 8 && (
                <>
                  <Panel title="Inputs" subtitle="Use the outputs from D5 and D7 to build the ManyChat logic." >
                    <div style={{ display: 'grid', gap: 12 }}>
                      <Field label="Keyword trigger">
                        <input className="input" value={activeState.d8.keywordTrigger} onChange={e => updateD8({ keywordTrigger: e.target.value })} placeholder="Use the same keyword as D5" />
                      </Field>
                      <Field label="Response tree">
                        <textarea className="input" rows={4} value={activeState.d8.responseTree} onChange={e => updateD8({ responseTree: e.target.value })} placeholder="Map the branch structure..." />
                      </Field>
                      <Field label="Conditions">
                        <textarea className="input" rows={4} value={activeState.d8.conditions} onChange={e => updateD8({ conditions: e.target.value })} placeholder="Conditions for branching..." />
                      </Field>
                      <Field label="Phone capture">
                        <input className="input" value={activeState.d8.phoneCapture} onChange={e => updateD8({ phoneCapture: e.target.value })} placeholder="Capture phone before booking" />
                      </Field>
                      <Field label="Booking branch">
                        <textarea className="input" rows={4} value={activeState.d8.bookingBranch} onChange={e => updateD8({ bookingBranch: e.target.value })} placeholder="Booking confirmation path..." />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="QA Checklist" subtitle="All branches tested, messages firing, and data capture confirmed.">
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        ['qaBranches', 'All branches tested'],
                        ['qaMessages', 'Messages firing'],
                        ['qaData', 'Data capture works'],
                      ].map(([key, label]) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                          <input type="checkbox" checked={(activeState.d8 as any)[key]} onChange={e => updateD8({ [key]: e.target.checked } as Partial<D8State>)} />
                          <span style={{ fontSize: 12 }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Build the ManyChat logic and QA sheet.">
                    <button className="btn-primary" onClick={generateD8} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Build ManyChat Logic
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Keyword trigger, response tree, conditions, phone capture, booking branch, and QA checklist.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d8.output || 'Generate the ManyChat logic to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(8)} nextLabel="Process complete" />
                  </Panel>
                </>
              )}

              {activeTab >= 9 && renderPhase2Deliverable(activeTab)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 12, background: 'var(--bg)' }}>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--white)', lineHeight: 1.6 }}>{value}</div>
    </div>
  )
}

function CompletionNotice({ complete, nextLabel }: { complete: boolean; nextLabel: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, border: `1px solid ${complete ? 'rgba(0,229,195,0.28)' : 'var(--border2)'}`, background: complete ? 'rgba(0,229,195,0.04)' : 'var(--bg)' }}>
      {complete ? <CheckCircle2 size={16} color="var(--teal)" /> : <Circle size={16} color="var(--grey2)" />}
      <div style={{ fontSize: 12, color: complete ? 'var(--teal)' : 'var(--grey)' }}>
        {complete ? `Unlocked ${nextLabel}` : `Complete this deliverable to unlock ${nextLabel}.`}
      </div>
    </div>
  )
}
