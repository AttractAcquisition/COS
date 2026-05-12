import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { useToast } from '../lib/toast'
import { format } from 'date-fns'

const VERTICALS = [
  'Auto Detailing', 'Vehicle Wrapping', 'Car Wash',
  'Pet Grooming', 'Pet Salon',
  'Trailer Manufacturing', 'Metal Fabrication', 'Engineering Shop',
  'Home Renovation', 'Landscaping', 'Plumbing', 'Electrical', 'HVAC',
  'Courier', 'Logistics',
  'Physiotherapy', 'Wellness Studio', 'Dental Clinic', 'Personal Training',
]

const LOCATIONS = [
  'Cape Town', 'Cape Town CBD', 'Woodstock', 'Salt River', 'Observatory',
  'Mowbray', 'Rondebosch', 'Claremont', 'Wynberg', 'Retreat',
  'Bellville', 'Parow', 'Goodwood', 'Pinelands',
  'Milnerton', 'Table View', 'Bloubergstrand',
  'Mitchells Plain', 'Kuils River', 'Brackenfell', 'Kraaifontein',
  'Hout Bay', 'Constantia', 'Tokai', 'Muizenberg',
  'Somerset West', 'Strand', 'Stellenbosch', 'Paarl',
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'zu', label: 'Zulu' },
]

interface ProspectRow {
  business_name: string; 
  vertical: string; 
  city: string; 
  suburb: string;
  address: string; 
  phone: string; 
  whatsapp: string; 
  website: string;
  google_rating: number | null; 
  google_review_count: number;
  status: string; 
  data_source: string; 
  apify_run_id: string;
  last_scraped_at: string; 
  saved?: boolean; 
  duplicate?: boolean;
}

type RunStatus = 'idle' | 'starting' | 'running' | 'succeeded' | 'failed'

interface AdvancedSettings {
  language:                  string
  skipClosedPlaces:           boolean
  includeWebResults:          boolean
  scrapeContacts:             boolean
  scrapePlaceDetailPage:      boolean
  scrapeReviewsPersonalData:  boolean
  instagram:                  boolean
  facebook:                   boolean
  tiktok:                     boolean
  twitter:                    boolean
  youtube:                    boolean
}

function estimateSeconds(maxResults: number) {
  return Math.ceil(maxResults / 10) * 15 + 5
}

export default function Scraper() {
  const [vertical, setVertical]         = useState('')
  const [customVertical, setCustom]     = useState('')
  const [location, setLocation]         = useState('Cape Town')
  const [maxResults, setMaxResults]     = useState(30)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advanced, setAdvanced]         = useState<AdvancedSettings>({
    language:                  'en',
    skipClosedPlaces:          true,
    includeWebResults:         false,
    scrapeContacts:            false,
    scrapePlaceDetailPage:     false,
    scrapeReviewsPersonalData: false,
    instagram:                 false,
    facebook:                  false,
    tiktok:                    false,
    twitter:                   false,
    youtube:                   false,
  })
  const [runStatus, setRunStatus]       = useState<RunStatus>('idle')
  const [activeRunId, setActiveRunId]   = useState('') 
  const [results, setResults]           = useState<ProspectRow[]>([])
  const [selected, setSelected]         = useState<Set<number>>(new Set())
  const [saving, setSaving]             = useState(false)
  const [elapsed, setElapsed]           = useState(0)
  const [pollCount, setPollCount]       = useState(0)
  const [errorMsg, setErrorMsg]         = useState('')

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const { toast } = useToast()

  const activeVertical   = customVertical || vertical
  const estimatedSeconds = estimateSeconds(maxResults)

  useEffect(() => {
    return () => {
      if (pollRef.current)  clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function adv(key: keyof AdvancedSettings, value: any) {
    setAdvanced(prev => ({ ...prev, [key]: value }))
  }

  function Toggle({ label, k }: { label: string; k: keyof AdvancedSettings }) {
    const val = advanced[k] as boolean
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--grey)' }}>{label}</span>
        <button onClick={() => adv(k, !val)}
          style={{ width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: val ? 'var(--teal)' : 'var(--grey2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: val ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>
    )
  }

  function startTimer() {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }
  function stopTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  function stopPolling() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  async function startRun() {
    if (!activeVertical) { toast('Select or enter a vertical', 'error'); return }
    setRunStatus('starting')
    setResults([])
    setSelected(new Set())
    setErrorMsg('')
    setElapsed(0)
    setPollCount(0)
    setActiveRunId('')

    try {
      const { data, error } = await supabase.functions.invoke('apify-start', {
        body: {
          search_term:    activeVertical,
          location_query: `${location}, South Africa`,
          max_results:    maxResults,
          language:                  advanced.language,
          skip_closed_places:        advanced.skipClosedPlaces,
          include_web_results:       advanced.includeWebResults,
          scrape_contacts:           advanced.scrapeContacts,
          scrape_place_detail_page:  advanced.scrapePlaceDetailPage,
          scrape_reviews_personal_data: advanced.scrapeReviewsPersonalData,
          social_media: {
            instagram: advanced.instagram,
            facebook:  advanced.facebook,
            tiktok:    advanced.tiktok,
            twitter:   advanced.twitter,
            youtube:   advanced.youtube,
          }
        }
      })
      if (error || data?.error) { setErrorMsg(data?.error || String(error)); setRunStatus('failed'); return }
      
      setActiveRunId(data.run_id)
      setRunStatus('running')
      startTimer()
      startPolling(data.run_id)
    } catch (err) {
      setErrorMsg(String(err))
      setRunStatus('failed')
    }
  }

  function startPolling(id: string) {
    pollRef.current = setInterval(async () => { setPollCount(c => c + 1); await checkResults(id) }, 5000)
  }

  async function checkResults(id: string) {
    try {
      const { data, error } = await supabase.functions.invoke('apify-results', { body: { run_id: id } })
      if (error || data?.error) { stopPolling(); stopTimer(); setErrorMsg(data?.error || String(error)); setRunStatus('failed'); return }

      if (data.status === 'SUCCEEDED') {
        stopPolling(); stopTimer()
        const batchNames = (data.prospects || []).map((p: ProspectRow) => p.business_name)
        const { data: existing } = await supabase
          .from('prospects')
          .select('business_name')
          .in('business_name', batchNames)
        const existingNames = new Set((existing || []).map((p: any) => p.business_name.toLowerCase().trim()))
        const withDupFlag = (data.prospects || []).map((p: ProspectRow) => ({ ...p, duplicate: existingNames.has(p.business_name.toLowerCase().trim()) }))
        setResults(withDupFlag)
        const newCount = withDupFlag.filter((p: ProspectRow) => !p.duplicate).length
        setSelected(new Set(withDupFlag.map((_: any, i: number) => i).filter((i: number) => !withDupFlag[i].duplicate)))
        setRunStatus('succeeded')
        toast(`${data.count} businesses found · ${newCount} new · ${withDupFlag.length - newCount} duplicates`)
        return
      }
      if (data.status === 'FAILED' || data.status === 'ABORTED' || data.status === 'TIMED-OUT') {
        stopPolling(); stopTimer(); setErrorMsg(`Apify run ended with status: ${data.status}`); setRunStatus('failed')
      }
    } catch (err) { stopPolling(); stopTimer(); setErrorMsg(String(err)); setRunStatus('failed') }
  }

  async function saveSelected() {
    const toSave = results.filter((_, i) => selected.has(i) && !results[i].duplicate)
    if (toSave.length === 0) { toast('No new prospects selected', 'error'); return }
    setSaving(true)

    // NEW: Inject target_date and pipeline_stage for CRM/Outreach compatibility
    const today = format(new Date(), 'yyyy-MM-dd')
    const formattedData = toSave.map(({ saved, duplicate, ...p }) => ({
      ...p,
      target_date: today,
      pipeline_stage: 'First Touch',
      is_archived: false
    }))

    const { error } = await supabase.from('prospects').insert(formattedData as any)
    
    if (error) { toast(`Save failed: ${error.message}`, 'error'); setSaving(false); return }
    setResults(prev => prev.map((r, i) => selected.has(i) ? { ...r, saved: true } : r))
    setSaving(false)
    toast(`${toSave.length} prospects saved to CRM ✓`)
  }

  function copyRunId() {
    navigator.clipboard.writeText(activeRunId)
    toast('Run ID copied to clipboard')
  }

  function toggleAll() {
    const newProspects = results.map((_, i) => i).filter(i => !results[i].duplicate)
    if (selected.size === newProspects.length) setSelected(new Set())
    else setSelected(new Set(newProspects))
  }

  function toggleOne(i: number) {
    if (results[i].duplicate) return
    setSelected(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }

  const newCount   = results.filter(r => !r.duplicate).length
  const dupCount   = results.filter(r => r.duplicate).length
  const savedCount = results.filter(r => r.saved).length
  const progress   = Math.min(100, Math.round(elapsed / estimatedSeconds * 100))

  return (
    <div className="sprint-panel" style={{ gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card">
          <div className="section-label">Search Settings</div>

          <div style={{ marginBottom: 12 }}>
            <div className="label">Vertical</div>
            <select className="input" value={vertical} onChange={e => { setVertical(e.target.value); setCustom('') }}>
              <option value="">Select vertical...</option>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="label">Or custom search term</div>
            <input className="input" placeholder="e.g. Swimming Pool Repair" value={customVertical}
              onChange={e => { setCustom(e.target.value); setVertical('') }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="label">Location</div>
            <select className="input" value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="label" style={{ margin: 0 }}>Max Results</div>
              <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--teal)' }}>{maxResults} (~{estimatedSeconds}s)</span>
            </div>
            <input type="range" min={10} max={100} step={10} value={maxResults}
              onChange={e => setMaxResults(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--teal)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)', marginTop: 4 }}>
              <span>10</span><span>50</span><span>100</span>
            </div>
          </div>

          <button onClick={() => setShowAdvanced(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '9px 12px', cursor: 'pointer', marginBottom: showAdvanced ? 0 : 16, color: 'var(--grey)', fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Advanced Settings
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAdvanced && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '0 0 6px 6px', padding: '14px 14px 4px', marginBottom: 16, borderTop: 'none' }}>
              <div style={{ marginBottom: 12 }}>
                <div className="label">Language</div>
                <select className="input" value={advanced.language} onChange={e => adv('language', e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Filters</div>
              <Toggle label="Skip closed places" k="skipClosedPlaces" />
              <Toggle label="Include web results" k="includeWebResults" />

              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, marginTop: 14 }}>Data Collection</div>
              <Toggle label="Scrape contacts" k="scrapeContacts" />
              <Toggle label="Scrape place detail page" k="scrapePlaceDetailPage" />
              <Toggle label="Scrape reviews personal data" k="scrapeReviewsPersonalData" />

              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, marginTop: 14 }}>Social Media Profiles</div>
              <Toggle label="Instagram" k="instagram" />
              <Toggle label="Facebook" k="facebook" />
              <Toggle label="TikTok" k="tiktok" />
              <Toggle label="Twitter / X" k="twitter" />
              <Toggle label="YouTube" k="youtube" />
            </div>
          )}

          <button className="btn-primary" onClick={startRun}
            disabled={runStatus === 'starting' || runStatus === 'running' || !activeVertical}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 }}>
            <Play size={14} />
            {runStatus === 'starting' ? 'Starting...' : runStatus === 'running' ? 'Scraping...' : 'Run Scraper →'}
          </button>
        </div>

        {runStatus !== 'idle' && (
          <div className="card">
            <div className="section-label">Run Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {runStatus === 'starting'  && <Clock size={16} color="var(--grey)" />}
              {runStatus === 'running'   && <div className="pulse-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)' }} />}
              {runStatus === 'succeeded' && <CheckCircle size={16} color="var(--green)" />}
              {runStatus === 'failed'    && <XCircle size={16} color="var(--red)" />}
              <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: runStatus === 'failed' ? 'var(--red)' : runStatus === 'succeeded' ? 'var(--green)' : 'var(--grey)' }}>
                {runStatus === 'starting'  && 'Starting Apify run...'}
                {runStatus === 'running'   && `Running · ${elapsed}s elapsed`}
                {runStatus === 'succeeded' && `Complete · ${elapsed}s total`}
                {runStatus === 'failed'    && 'Run failed'}
              </span>
            </div>
            
            {activeRunId && (
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg2)', borderRadius: 4 }}>
                <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)' }}>ID: {activeRunId.slice(0, 8)}...</span>
                <button onClick={copyRunId} className="btn-ghost" style={{ padding: 4 }} title="Copy Run ID">
                  <Copy size={12} />
                </button>
              </div>
            )}

            {runStatus === 'running' && (
              <>
                <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 2, width: `${progress}%`, transition: 'width 1s linear' }} />
                </div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--grey2)' }}>
                  Est. {Math.max(0, estimatedSeconds - elapsed)}s remaining · poll #{pollCount}
                </div>
              </>
            )}
            {runStatus === 'failed' && errorMsg && (
              <div style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.6, marginTop: 8, fontFamily: 'DM Mono', wordBreak: 'break-word' }}>{errorMsg}</div>
            )}
            {runStatus === 'succeeded' && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Total found',    value: results.length,                        color: 'var(--white)' },
                  { label: 'New prospects', value: newCount,                               color: 'var(--teal)' },
                  { label: 'Duplicates',     value: dupCount,                               color: 'var(--grey2)' },
                  { label: 'With phone',    value: results.filter(r => r.phone).length,  color: 'var(--white)' },
                  { label: 'Selected',      value: selected.size,                        color: 'var(--amber)' },
                  { label: 'Saved',          value: savedCount,                           color: 'var(--green)' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--grey)' }}>{s.label}</span>
                    <span style={{ fontFamily: 'DM Mono', color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {runStatus === 'succeeded' && selected.size > 0 && (
          <button className="btn-primary" onClick={saveSelected} disabled={saving}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14 }}>
            {saving ? 'Saving...' : `Save ${selected.size} to Prospects →`}
          </button>
        )}
      </div>

      <div>
        {runStatus === 'idle' && (
          <div className="empty-state">
            <h3>Apify Scraper</h3>
            <p>Select a vertical and location, set max results, and run. Results load from Google Maps directly into your prospects table. Duplicates are detected automatically.</p>
          </div>
        )}
        {(runStatus === 'starting' || runStatus === 'running') && (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Scraping Google Maps</div>
            <div style={{ color: 'var(--grey)', fontSize: 14, marginBottom: 6 }}>
              Searching <span style={{ color: 'var(--teal)' }}>{activeVertical}</span> in <span style={{ color: 'var(--teal)' }}>{location}</span>
            </div>
            <div style={{ color: 'var(--grey2)', fontFamily: 'DM Mono', fontSize: 12, marginBottom: 24 }}>
              Max {maxResults} results · est. {estimatedSeconds}s
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--teal)', opacity: 0.7, animation: `pulse-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
            </div>
          </div>
        )}
        {runStatus === 'failed' && (
          <div className="card" style={{ textAlign: 'center', padding: 48, border: '1px solid rgba(226,75,74,0.3)' }}>
            <XCircle size={32} color="var(--red)" style={{ margin: '0 auto 14px' }} />
            <div style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Scraper Failed</div>
            <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 16 }}>Check the error in the status panel and verify your Apify token in Supabase secrets.</div>
            <button className="btn-secondary" onClick={() => setRunStatus('idle')}>Reset</button>
          </div>
        )}
        {runStatus === 'succeeded' && results.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border2)', background: 'var(--bg3)' }}>
              <div onClick={toggleAll}
                style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${selected.size === newCount ? 'var(--teal)' : 'var(--grey2)'}`, background: selected.size === newCount ? 'var(--teal)' : 'transparent', cursor: 'pointer', flexShrink: 0 }}>
                {selected.size === newCount && newCount > 0 && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ display: 'block' }}>
                    <path d="M1 4L3.5 6.5L9 1" stroke="#070F0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--grey)' }}>{selected.size} selected · {newCount} new · {dupCount} duplicates</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{activeVertical} · {location}</span>
            </div>
            <div style={{ maxHeight: 620, overflowY: 'auto' }}>
              {results.map((r, i) => (
                <div key={i} onClick={() => toggleOne(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--border2)', cursor: r.duplicate ? 'default' : 'pointer', background: r.saved ? 'rgba(29,158,117,0.05)' : selected.has(i) ? 'var(--teal-faint)' : 'transparent', opacity: r.duplicate ? 0.45 : 1, transition: 'background 0.1s' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${r.duplicate ? 'var(--grey2)' : selected.has(i) ? 'var(--teal)' : 'var(--grey2)'}`, background: selected.has(i) ? 'var(--teal)' : 'transparent' }}>
                    {selected.has(i) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ display: 'block' }}><path d="M1 4L3.5 6.5L9 1" stroke="#070F0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.business_name}</span>
                      {r.saved && <CheckCircle size={12} color="var(--green)" />}
                      {r.duplicate && <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--grey2)', background: 'var(--bg4)', padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>duplicate</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.suburb}{r.suburb && r.address ? ' · ' : ''}{r.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0, alignItems: 'center' }}>
                    {r.google_rating ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--amber)' }}>{r.google_rating} ★</div>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)' }}>{r.google_review_count} reviews</div>
                      </div>
                    ) : null}
                    <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: r.phone ? 'var(--grey)' : 'var(--grey2)', minWidth: 130, textAlign: 'right' }}>{r.phone || 'no phone'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
