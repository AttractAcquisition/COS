// src/pages/spoa.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Prospect } from '../lib/supabase'
import {
  Search, Zap, Copy,
  Download, Printer, Eye,
  Users, Target, ShieldCheck,
} from 'lucide-react'
import { useToast } from '../lib/toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PreviewStats {
  business_name:    string
  sector:           string
  geography:        string
  job_value_range:  string
  annual_ltv:       string
  estimated_missed: string
  google_reviews:   number
  has_instagram:    boolean
  running_ads:      boolean
  ref:              string
  date:             string
}

// Edge function now returns body_html (raw sections) instead of a full html doc
interface SPOAResult {
  body_html:     string
  preview_stats: PreviewStats
  success:       boolean
  error?:        string
}

// ─── Static Document Shell ────────────────────────────────────────────────────
// All CSS lives here — zero tokens wasted on styles in the Edge Function.
// Call buildFullDocument(bodyHtml, ref, year) to get a print-ready HTML string.
function buildFullDocument(bodyHtml: string, ref: string, year: number): string {
  const SPOA_STYLES = `
    /* ── Reset ─────────────────────────────────────────── */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Fonts (loaded in iframe via @import) ───────────── */
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap');

    /* ── Brand Tokens ───────────────────────────────────── */
    :root {
      --bg:          #07100e;
      --bg2:         #0a1412;
      --card:        #111a18;
      --border:      #1e2624;
      --teal:        #00C9A7;
      --teal-faint:  rgba(0,201,167,0.07);
      --white:       #EEF2F1;
      --grey:        #7A9490;
      --gold:        #C9A84C;
      --gold-faint:  rgba(201,168,76,0.05);
      --danger:      #FF4444;
    }

    /* ── Base ───────────────────────────────────────────── */
    html, body {
      background:              var(--bg);
      color:                   var(--white);
      font-family:             'DM Sans', system-ui, sans-serif;
      font-size:               13px;
      line-height:             1.7;
      -webkit-print-color-adjust: exact;
      print-color-adjust:      exact;
    }

    /* ── Pages ──────────────────────────────────────────── */
    .page {
      min-height:       100vh;
      padding:          60px 64px;
      position:         relative;
      border-bottom:    1px solid var(--border);
      page-break-after: always;
    }
    .page:last-child { border-bottom: none; page-break-after: auto; }

    .section-wrap {
      max-width:  860px;
      margin:     0 auto;
    }

    /* ── Cover Page ─────────────────────────────────────── */
    .cover {
      display:         flex;
      flex-direction:  column;
      justify-content: center;
      min-height:      100vh;
      background:      radial-gradient(ellipse at 80% 10%, rgba(0,201,167,0.08) 0%, transparent 60%),
                       radial-gradient(ellipse at 10% 90%, rgba(201,168,76,0.05) 0%, transparent 50%);
    }
    .cover-eyebrow {
      font-family:     'DM Mono', monospace;
      font-size:       10px;
      color:           var(--teal);
      letter-spacing:  3px;
      text-transform:  uppercase;
      margin-bottom:   24px;
    }
    .cover-title {
      font-family:  'DM Serif Display', serif;
      font-size:    clamp(36px, 5vw, 56px);
      line-height:  1.15;
      color:        var(--white);
      margin-bottom: 8px;
    }
    .cover-subtitle {
      font-family:  'DM Serif Display', serif;
      font-size:    clamp(20px, 3vw, 28px);
      color:        var(--teal);
      margin-bottom: 48px;
    }
    .cover-meta {
      display:       grid;
      grid-template-columns: auto 1fr;
      gap:           6px 24px;
      font-family:   'DM Mono', monospace;
      font-size:     11px;
      color:         var(--grey);
      margin-bottom: 64px;
    }
    .cover-meta strong { color: var(--white); }
    .cover-divider {
      width:        64px;
      height:       2px;
      background:   linear-gradient(90deg, var(--teal), transparent);
      margin-bottom: 48px;
    }

    /* ── Typography ─────────────────────────────────────── */
    .section-label {
      font-family:    'DM Mono', monospace;
      font-size:      9px;
      color:          var(--teal);
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom:  10px;
    }
    .section-title {
      font-family:   'DM Serif Display', serif;
      font-size:     clamp(24px, 3vw, 36px);
      color:         var(--white);
      margin-bottom: 32px;
      line-height:   1.2;
    }

    /* ── Clauses ────────────────────────────────────────── */
    .clause {
      margin-bottom: 14px;
      color:         #c8d6d2;
      text-align:    justify;
      hyphens:       auto;
    }
    .clause b {
      display:        inline-block;
      color:          var(--teal);
      font-family:    'DM Mono', monospace;
      font-size:      10px;
      font-weight:    500;
      min-width:      36px;
      margin-right:   6px;
    }
    h3.sub-heading {
      font-family:   'DM Mono', monospace;
      font-size:     11px;
      color:         var(--gold);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin:        24px 0 12px;
    }

    /* ── Tables ─────────────────────────────────────────── */
    table.fee-table {
      width:           100%;
      border-collapse: collapse;
      margin:          24px 0;
      font-size:       12px;
    }
    table.fee-table th,
    table.fee-table td {
      padding:     12px 14px;
      border:      1px solid var(--border);
      text-align:  left;
      vertical-align: top;
    }
    table.fee-table thead th {
      background:     var(--card);
      color:          var(--teal);
      font-family:    'DM Mono', monospace;
      font-size:      9px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      white-space:    nowrap;
    }
    table.fee-table tbody tr:nth-child(even) td {
      background: var(--teal-faint);
    }
    table.fee-table tbody td:first-child {
      font-family: 'DM Mono', monospace;
      font-size:   11px;
      color:       var(--white);
    }

    /* ── Callouts ───────────────────────────────────────── */
    .gold-callout {
      border:        1px solid var(--gold);
      border-left:   3px solid var(--gold);
      padding:       20px 24px;
      background:    var(--gold-faint);
      margin:        24px 0;
      border-radius: 2px;
    }
    .gold-callout .callout-label {
      font-family:    'DM Mono', monospace;
      font-size:      9px;
      color:          var(--gold);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom:  8px;
    }
    .gold-callout p {
      color:        var(--white);
      font-size:    13px;
      line-height:  1.6;
    }
    .gold-callout .amount {
      font-family:  'DM Serif Display', serif;
      font-size:    22px;
      color:        var(--gold);
      margin-top:   8px;
    }

    /* ── Schedule Table ─────────────────────────────────── */
    table.schedule-table {
      width:           100%;
      border-collapse: collapse;
      margin:          16px 0;
      font-size:       12px;
    }
    table.schedule-table td {
      padding:  10px 14px;
      border:   1px solid var(--border);
    }
    table.schedule-table td:first-child {
      width:       40%;
      font-family: 'DM Mono', monospace;
      font-size:   10px;
      color:       var(--grey);
      text-transform: uppercase;
      letter-spacing: 1px;
      background:  var(--card);
    }
    table.schedule-table td:last-child {
      color: var(--white);
    }

    /* ── Signature Grid ─────────────────────────────────── */
    .sig-grid {
      display:               grid;
      grid-template-columns: 1fr 1fr;
      gap:                   48px;
      margin-top:            48px;
    }
    .sig-block .sig-party {
      font-family:    'DM Mono', monospace;
      font-size:      9px;
      color:          var(--teal);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom:  32px;
    }
    .sig-line {
      border-bottom: 1px solid var(--border);
      height:        44px;
      margin-bottom: 8px;
    }
    .sig-field-label {
      font-family:    'DM Mono', monospace;
      font-size:      9px;
      color:          var(--grey);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom:  20px;
    }

    /* ── Footer ─────────────────────────────────────────── */
    .footer-meta {
      position:        absolute;
      bottom:          32px;
      left:            64px;
      right:           64px;
      display:         flex;
      justify-content: space-between;
      font-family:     'DM Mono', monospace;
      font-size:       9px;
      color:           var(--grey);
      border-top:      1px solid var(--border);
      padding-top:     16px;
      letter-spacing:  0.5px;
    }

    /* ── Print Overrides ────────────────────────────────── */
    @media print {
      @page { margin: 0; size: A4 portrait; }
      body  { background: var(--bg) !important; }
      .page { page-break-after: always; }
    }
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SPOA — ${ref}</title>
  <style>${SPOA_STYLES}</style>
</head>
<body>
  ${bodyHtml}
  <div class="footer-meta" style="position:fixed;bottom:0;left:0;right:0;padding:12px 64px;background:var(--bg);">
    <span>REF: ${ref}</span>
    <span>© ${year} ATTRACT ACQUISITION (PTY) LTD — ALL RIGHTS RESERVED</span>
    <span>CONFIDENTIAL &amp; LEGALLY BINDING</span>
  </div>
</body>
</html>`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function GapBadge({ label, value }: { label: string; value: boolean | number | string }) {
  const isGood =
    value === true ||
    value === 'yes' ||
    (typeof value === 'number' && value >= 50)
  const isBad =
    value === false ||
    value === 'no' ||
    value === 0 ||
    (typeof value === 'number' && value < 10)

  const colour = isGood ? 'var(--teal)' : isBad ? '#FF4444' : '#F59E0B'
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)

  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '8px 0',
      borderBottom:   '1px solid var(--border2)',
    }}>
      <span style={{
        color:         'var(--grey)',
        fontFamily:    'DM Mono',
        fontSize:      10,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {label}
      </span>
      <span style={{ color: colour, fontFamily: 'DM Mono', fontSize: 11, fontWeight: 500 }}>
        {display}
      </span>
    </div>
  )
}

function ReportIframe({
  html,
  title,
  height = 820,
}: {
  html: string
  title: string
  height?: number
}) {
  return (
    <iframe
      key={html.length} // remount when content changes
      title={title}
      srcDoc={html}
      style={{
        width:      '100%',
        height,
        border:     'none',
        display:    'block',
        background: '#07100e',
      }}
      sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
    />
  )
}

// ─── Main SPOA Component ──────────────────────────────────────────────────────
export default function SPOA() {
  const [search,            setSearch]            = useState('')
  const [allProspects,      setAllProspects]       = useState<Prospect[]>([])
  const [filteredProspects, setFilteredProspects]  = useState<Prospect[]>([])
  const [selected,          setSelected]           = useState<Prospect | null>(null)
  const [spoaResult,        setSpoaResult]         = useState<SPOAResult | null>(null)
  const [fullHtml,          setFullHtml]           = useState<string | null>(null) // assembled doc
  const [generating,        setGenerating]         = useState(false)
  const [showPreview,       setShowPreview]        = useState(false)
  const blobUrlRef = useRef<string | null>(null)
  const { toast } = useToast()

  // ── Load Prospects ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadProspects() {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('[SPOA] Failed to load prospects:', error.message)
        return
      }
      if (data) {
        setAllProspects(data as Prospect[])
        setFilteredProspects(data as Prospect[])
      }
    }
    loadProspects()
  }, [])

  // ── Search Filter ───────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase().trim()
    if (!q) {
      setFilteredProspects(allProspects)
      return
    }
    setFilteredProspects(
      allProspects.filter(p =>
        p.business_name?.toLowerCase().includes(q) ||
        p.suburb?.toLowerCase().includes(q) ||
        p.vertical?.toLowerCase().includes(q)
      )
    )
  }, [search, allProspects])

  // ── Blob URL Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // ── Select Prospect ─────────────────────────────────────────────────────────
  function selectProspect(p: Prospect) {
    setSelected(p)
    setSpoaResult(null)
    setFullHtml(null)
    setShowPreview(false)
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }

  // ── Generate SPOA ───────────────────────────────────────────────────────────
  async function generateSPOA() {
    if (!selected) {
      toast('Select a prospect first', 'error')
      return
    }

    setGenerating(true)
    setSpoaResult(null)
    setFullHtml(null)
    setShowPreview(false)

    console.log('[SPOA] Starting generation for:', selected.business_name)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired — please log in again')

      console.log('[SPOA] Session OK. Invoking edge function...')

      const { data, error } = await supabase.functions.invoke<SPOAResult>(
        'spoa-generator',
        {
          body:    { prospect: selected },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )

      console.log('[SPOA] Edge function response:', { data, error })

      if (error) throw error
      if (!data) throw new Error('No response data received')
      if (!data.success) throw new Error((data as any).error || 'Generation failed')

      const html = data.body_html?.trim() ?? ''
      if (!html) throw new Error('Empty HTML returned — please regenerate')

      const assembledDoc = buildFullDocument(html, data.preview_stats.ref, new Date().getFullYear())
      const bom = '\uFEFF'
      const blob = new Blob([bom + assembledDoc], { type: 'text/html;charset=utf-8' })
      blobUrlRef.current = URL.createObjectURL(blob)

      setSpoaResult(data)
      setFullHtml(assembledDoc)
      setShowPreview(true)

      // TODO Phase 3: route through a patch-prospect AICOS Edge Function
      const { error: updateErr } = await supabase
        .from('prospects')
        .update({ spoa_delivered_at: new Date().toISOString() } as never)
        .eq('id', selected.id)

      if (updateErr) console.warn('[SPOA] CRM timestamp update failed:', updateErr.message)

      toast('SPOA compiled successfully ✓', 'success')

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[SPOA] Generation error:', msg)
      toast(msg || 'Check Supabase edge function logs', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ── Download HTML ───────────────────────────────────────────────────────────
  const downloadHTML = useCallback(() => {
    if (!spoaResult?.body_html || !selected) return
    const assembledDoc = buildFullDocument(spoaResult.body_html, spoaResult.preview_stats.ref, new Date().getFullYear())
    const bom = '\uFEFF'
    const blob = new Blob([bom + assembledDoc], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = selected.business_name.replace(/[^a-zA-Z0-9]/g, '_')

    a.href = url
    a.download = `SPOA_${name}_${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    console.log('[SPOA] HTML download triggered')
  }, [spoaResult, selected])

  // ── Print ───────────────────────────────────────────────────────────────────
  const printReport = useCallback(() => {
    if (!spoaResult?.body_html || !selected) return
    const assembledDoc = buildFullDocument(spoaResult.body_html, spoaResult.preview_stats.ref, new Date().getFullYear())
    const win = window.open('', '_blank', 'noopener')
    if (win) {
      win.document.open()
      win.document.write(assembledDoc)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    }
  }, [spoaResult, selected])

  const copyFullHTML = useCallback(() => {
    if (!spoaResult?.body_html || !selected) return
    const assembledDoc = buildFullDocument(spoaResult.body_html, spoaResult.preview_stats.ref, new Date().getFullYear())
    navigator.clipboard.writeText(assembledDoc).then(() => {
      toast('Full HTML copied to clipboard ✓', 'success')
    })
  }, [spoaResult, selected, toast])

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '320px 1fr',
      gap:                 24,
      height:              'calc(100vh - 100px)',
    }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>

      {/* ── Sidebar: Prospect List ─────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding:       16,
          display:       'flex',
          flexDirection: 'column',
          gap:           14,
          overflow:      'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} style={{ color: 'var(--teal)' }} />
          <div className="section-label" style={{ margin: 0 }}>Prospect Explorer</div>
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position:  'absolute',
              left:      12,
              top:       '50%',
              transform: 'translateY(-50%)',
              color:     'var(--grey2)',
            }}
          />
          <input
            className="input"
            placeholder="Search name, vertical, suburb..."
            style={{ paddingLeft: 34, fontSize: 13 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{
          flex:          1,
          overflowY:     'auto',
          display:       'flex',
          flexDirection: 'column',
          gap:           6,
        }}>
          {filteredProspects.length === 0 && (
            <div style={{
              padding:   24,
              textAlign: 'center',
              color:     'var(--grey)',
              fontFamily:'DM Mono',
              fontSize:  11,
            }}>
              {search ? 'No matches found' : 'No prospects loaded'}
            </div>
          )}
          {filteredProspects.map(p => (
            <div
              key={p.id}
              onClick={() => selectProspect(p)}
              style={{
                padding:      12,
                cursor:       'pointer',
                borderRadius: 6,
                background:   selected?.id === p.id ? 'var(--teal-faint)' : 'var(--bg3)',
                border:       `1px solid ${selected?.id === p.id ? 'var(--teal-border)' : 'var(--border2)'}`,
                transition:   'background 0.15s, border-color 0.15s',
              }}
            >
              <div style={{
                fontSize:    13,
                fontWeight:  600,
                color:       selected?.id === p.id ? 'var(--teal)' : 'var(--white)',
                marginBottom: 3,
              }}>
                {p.business_name}
              </div>
              <div style={{
                fontSize:   11,
                color:      'var(--grey)',
                fontFamily: 'DM Mono',
              }}>
                {p.vertical ?? '—'} · {p.suburb ?? '—'}
              </div>
              {p.spoa_delivered_at && (
                <div style={{
                  fontSize:      9,
                  color:         'var(--teal)',
                  fontFamily:    'DM Mono',
                  marginTop:     4,
                  opacity:       0.7,
                }}>
                  ✓ SPOA {new Date(p.spoa_delivered_at).toLocaleDateString('en-ZA')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Workspace ────────────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', paddingRight: 8 }}>
        {!selected ? (
          <div className="empty-state" style={{ height: '100%' }}>
            <Target size={40} style={{ color: 'var(--border2)', marginBottom: 16 }} />
            <h2 style={{ fontFamily: 'Playfair Display', marginBottom: 8 }}>SPOA Studio</h2>
            <p style={{ color: 'var(--grey)', maxWidth: 400, textAlign: 'center' }}>
              Select a prospect from the left to generate their legally binding
              Strategic Plan of Action.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header Card */}
            <div className="card" style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              padding:        '24px',
            }}>
              <div>
                <h1 style={{ fontFamily: 'Playfair Display', fontSize: 26, margin: 0 }}>
                  {selected.business_name}
                </h1>
                <p style={{
                  color:      'var(--grey)',
                  margin:     '6px 0 0 0',
                  fontFamily: 'DM Mono',
                  fontSize:   12,
                }}>
                  {selected.vertical ?? 'Unknown Sector'} // {selected.suburb ?? 'Unknown Location'}
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={generateSPOA}
                disabled={generating}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Zap size={16} />
                {generating ? 'Compiling Strategy…' : 'Execute SPOA Generation →'}
              </button>
            </div>

            <div style={{
              display:             'grid',
              gridTemplateColumns: spoaResult ? '1fr' : '350px 1fr',
              gap:                 20,
            }}>

              {/* Audit Panel (hidden once SPOA is available) */}
              {!spoaResult && (
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label" style={{ marginBottom: 16 }}>
                    Infrastructure Audit
                  </div>
                  <GapBadge label="Google Reviews" value={selected.google_review_count ?? 0} />
                  <GapBadge
                    label="Star Rating"
                    value={selected.google_rating ? `${selected.google_rating}★` : 'Unrated'}
                  />
                  <GapBadge
                    label="Instagram"
                    value={selected.instagram_handle ? `@${selected.instagram_handle}` : 'None'}
                  />
                  <GapBadge label="Meta Ads Active" value={!!selected.has_meta_ads} />

                  {selected.mjr_notes && (
                    <div style={{
                      marginTop:    20,
                      padding:      14,
                      background:   'var(--bg2)',
                      borderRadius: 6,
                    }}>
                      <div style={{
                        fontSize:      10,
                        color:         'var(--teal)',
                        fontFamily:    'DM Mono',
                        marginBottom:  8,
                      }}>
                        ANALYSIS NOTES
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
                        {selected.mjr_notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Result Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Generating Indicator */}
                {generating && (
                  <div className="card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                    <div style={{
                      fontFamily:   'Playfair Display',
                      fontSize:     22,
                      marginBottom: 24,
                    }}>
                      Structuring Acquisition Engine…
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          style={{
                            width:        10,
                            height:       10,
                            borderRadius: '50%',
                            background:   'var(--teal)',
                            animation:    `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <div style={{
                      marginTop:  20,
                      fontFamily: 'DM Mono',
                      fontSize:   10,
                      color:      'var(--grey)',
                    }}>
                      Drafting clauses, fees &amp; schedules via Claude…
                    </div>
                  </div>
                )}

                {/* SPOA Result */}
                {spoaResult && !generating && (
                  <>
                    {/* Toolbar */}
                    <div style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      padding:        '16px 20px',
                      borderRadius:   8,
                      background:     'rgba(0,201,167,0.06)',
                      border:         '1px solid var(--teal-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ShieldCheck size={20} style={{ color: 'var(--teal)' }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            Strategic Plan Compiled
                          </div>
                          <div style={{
                            fontSize:   11,
                            color:      'var(--grey)',
                            fontFamily: 'DM Mono',
                          }}>
                            Ref: {spoaResult.preview_stats.ref} // SA Law Compliant
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          className="btn-secondary"
                          onClick={printReport}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                        >
                          <Printer size={14} /> Print / PDF
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setShowPreview(v => !v)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                        >
                          <Eye size={14} /> {showPreview ? 'Hide' : 'Preview'}
                        </button>
                        <button
                          className="btn-primary"
                          onClick={downloadHTML}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      {[
                        {
                          value: spoaResult.preview_stats.estimated_missed,
                          label: 'REVENUE GAP',
                          color: '#FF4444',
                        },
                        {
                          value: spoaResult.preview_stats.annual_ltv,
                          label: 'ANNUAL LTV',
                          color: 'var(--teal)',
                        },
                        {
                          value: spoaResult.preview_stats.job_value_range,
                          label: 'AVG JOB VALUE',
                          color: 'var(--white)',
                        },
                      ].map(({ value, label, color }) => (
                        <div
                          key={label}
                          className="card"
                          style={{ textAlign: 'center', padding: '20px' }}
                        >
                          <div style={{
                            fontFamily: 'Playfair Display',
                            fontSize:   22,
                            fontWeight: 700,
                            color,
                          }}>
                            {value}
                          </div>
                          <div style={{
                            fontFamily: 'DM Mono',
                            fontSize:   10,
                            color:      'var(--grey)',
                            marginTop:  4,
                          }}>
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* SOP Steps */}
                    <div className="card" style={{
                      borderLeft: '3px solid var(--teal)',
                      padding:    '24px',
                    }}>
                      <div className="section-label" style={{ marginBottom: 20 }}>
                        SOP 03 — Delivery Sequence
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                        {[
                          {
                            num:    '01',
                            title:  'Verification',
                            body:   'Review Schedule A for geographic and sector accuracy before delivery.',
                          },
                          {
                            num:    '02',
                            title:  'Legal Signature',
                            body:   'Obtain signature from authorized representative (Party B).',
                          },
                          {
                            num:    '03',
                            title:  'Portal Onboarding',
                            body:   'Provision AA Portal access within 24h of signed agreement.',
                          },
                          {
                            num:    '04',
                            title:  'Sprint Kickoff',
                            body:   'Launch Attraction Engine; 14-day Proof Sprint clock starts.',
                          },
                        ].map(({ num, title, body }) => (
                          <div key={num} style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                              fontFamily: 'DM Mono',
                              color:      'var(--teal)',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            }}>
                              {num}
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--off-white)' }}>
                              <span style={{
                                fontWeight: 600,
                                display:    'block',
                                color:      'var(--white)',
                                marginBottom: 2,
                              }}>
                                {title}
                              </span>
                              {body}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="btn-secondary" onClick={generateSPOA} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                        <Zap size={13} /> Regenerate
                      </button>
                      <button className="btn-secondary" onClick={downloadHTML} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 24px' }}>
                        <Download size={13} /> Source
                      </button>
                      <button className="btn-secondary" onClick={copyFullHTML} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 24px' }}>
                        <Copy size={13} /> Copy
                      </button>
                    </div>

                    {showPreview && (
                      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border2)', marginTop: 8 }}>
                        <ReportIframe html={fullHtml ?? ''} title="SPOA Preview" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
