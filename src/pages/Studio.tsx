// src/pages/Studio.tsx
// ─────────────────────────────────────────────────────────────────────────────
// MJR Studio — Prospect Explorer + Report Workspace
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Prospect } from '../lib/supabase'
import {
  Zap, Copy, Download, Printer, Eye, EyeOff,
  Users, Target, CheckCircle, AlertCircle,
  Loader,
} from 'lucide-react'
import { useToast } from '../lib/toast'
import { MJR_STYLES, wrapWithStyles } from '../lib/docStyles'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PreviewStats {
  business_name:   string
  sector:          string
  geography:       string
  job_value_range: string
  annual_ltv:      string
  estimated_missed: string
  google_reviews:  number
  has_instagram:   boolean
  running_ads:     boolean
}

// The shape we expect back from the Edge Function
interface MJRSuccess {
  success: true
  html: string
  preview_stats: PreviewStats
}
interface MJRFailure {
  success: false
  error: string
}
type MJRResult = MJRSuccess | MJRFailure

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single row in the "current context" audit panel */
function AuditRow({
  label,
  value,
}: {
  label: string
  value: boolean | number | string
}) {
  // Colouring heuristic
  const isGood =
    value === true ||
    value === 'Active' ||
    (typeof value === 'number' && value >= 30)
  const isBad =
    value === false ||
    value === 'Missing' ||
    value === 0 ||
    (typeof value === 'number' && value < 10)

  const colour = isGood
    ? 'var(--teal)'
    : isBad
    ? '#FF4444'
    : '#F59E0B'

  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--border2)',
      }}
    >
      <span
        style={{
          color: 'var(--grey)',
          fontFamily: 'DM Mono, monospace',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: colour,
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {display}
      </span>
    </div>
  )
}

/**
 * Renders the generated MJR HTML inside a sandboxed iframe.
 * The iframe is the CSS isolation boundary — MJR styles never touch Studio.
 */
function ReportIframe({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Using srcDoc is correct but we also need to handle the iframe height
  // auto-growing once content is loaded.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        const body = iframe.contentDocument?.body
        if (body) {
          // Let the iframe grow to its content height (max 1200px in studio)
          const h = Math.min(body.scrollHeight + 32, 1200)
          iframe.style.height = `${h}px`
        }
      } catch {
        // Cross-origin guard (shouldn't happen with srcDoc but be safe)
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      // key forces React to remount (and therefore reload) when HTML changes
      key={html.slice(-32)}
      srcDoc={html}
      title="MJR Preview"
      style={{
        width: '100%',
        height: '800px',      // initial height — grows on load
        border: 'none',
        borderRadius: 8,
        background: '#0D0D0D',
        display: 'block',
      }}
      // allow-scripts is needed if the report ever uses JS (e.g. charts)
      // allow-same-origin is needed so iframe can read its own document height
      sandbox="allow-same-origin allow-scripts allow-popups"
    />
  )
}

/** Numeric stat card for the post-generation summary row */
function StatCard({
  value,
  label,
  colour = 'var(--white)',
}: {
  value: string
  label: string
  colour?: string
}) {
  return (
    <div
      className="card"
      style={{ textAlign: 'center', padding: '20px 16px' }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: colour,
          fontFamily: 'DM Mono, monospace',
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div
        className="section-label"
        style={{ marginBottom: 0, fontSize: 9 }}
      >
        {label}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Studio() {
  const [search, setSearch]                 = useState('')
  const [allProspects, setAllProspects]     = useState<Prospect[]>([])
  const [filteredProspects, setFilteredProspects] = useState<Prospect[]>([])
  const [selected, setSelected]             = useState<Prospect | null>(null)
  const [mjrResult, setMjrResult]           = useState<MJRSuccess | null>(null)
  const [errorMsg, setErrorMsg]             = useState<string | null>(null)
  const [generating, setGenerating]         = useState(false)
  const [showPreview, setShowPreview]       = useState(true)
  const [copied, setCopied]                 = useState(false)

  // We store the blob URL separately so we can revoke it on cleanup
  const blobUrlRef = useRef<string | null>(null)
  const { toast } = useToast()

  // ── Load prospects ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!cancelled) {
        if (error) {
          console.error('[Studio] Failed to load prospects:', error.message)
          toast('Failed to load prospects', 'error')
        } else {
          setAllProspects(data ?? [])
          setFilteredProspects(data ?? [])
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search filter ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      setFilteredProspects(allProspects)
      return
    }
    setFilteredProspects(
      allProspects.filter(
        (p) =>
          p.business_name.toLowerCase().includes(q) ||
          p.suburb?.toLowerCase().includes(q) ||
          p.vertical?.toLowerCase().includes(q)
      )
    )
  }, [search, allProspects])

  // ── Revoke blob URL when component unmounts ────────────────────────────────
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // ── Select prospect ────────────────────────────────────────────────────────
  const handleSelectProspect = useCallback((p: Prospect) => {
    setSelected(p)
    setMjrResult(null)
    setErrorMsg(null)
    setShowPreview(true)
  }, [])

  // ── Generate MJR ──────────────────────────────────────────────────────────
  async function generateMJR() {
    if (!selected || generating) return

    setGenerating(true)
    setMjrResult(null)
    setShowPreview(false)

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast('Session expired — please sign in again', 'error')
        setGenerating(false)
        return
      }

      const { data, error } = await supabase.functions.invoke<MJRResult>('sop-08-mjr-build', {
        body: { prospect: selected },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) throw error
      if (!data) throw new Error('No response data received')
      if (!data.success) throw new Error((data as unknown as { error: string }).error || 'Generation failed')

      const html = data.html?.trim() ?? ''
      if (!html) throw new Error('Empty HTML returned — please regenerate')

      const fullHtml = wrapWithStyles(html, MJR_STYLES, `MJR — ${selected.business_name}`)
      const bom = '\uFEFF'
      const blob = new Blob([bom + fullHtml], { type: 'text/html;charset=utf-8' })
      blobUrlRef.current = URL.createObjectURL(blob)

      // 7. Update state
      setMjrResult(data as MJRSuccess)
      setShowPreview(true)
      toast(`MJR compiled for ${(data as MJRSuccess).preview_stats.business_name} ✓`, 'success')

      // 8. Record delivery timestamp in the database (non-blocking)
      supabase
        .from('prospects')
        .update({ mjr_delivered_at: new Date().toISOString() })
        .eq('id', selected.id)
        .then(({ error: dbErr }) => {
          if (dbErr) console.warn('[Studio] Failed to update mjr_delivered_at:', dbErr.message)
        })

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[Studio] generateMJR error:', msg)
      toast(msg || 'Generation failed — check API logs', 'error')
    }

    setGenerating(false)
  }

  const downloadHTML = useCallback(() => {
    if (!mjrResult?.html || !selected) return
    const fullHtml = wrapWithStyles(mjrResult.html, MJR_STYLES, `MJR — ${selected.business_name}`)
    const bom = '\uFEFF'
    const blob = new Blob([bom + fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = selected.business_name.replace(/[^a-zA-Z0-9]/g, '_')

    a.href = url
    a.download = `MJR_${name}_${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast('HTML report downloaded ✓', 'success')
  }, [mjrResult, selected, toast])

  const printReport = useCallback(() => {
    if (!mjrResult?.html || !selected) return
    const fullHtml = wrapWithStyles(mjrResult.html, MJR_STYLES, `MJR — ${selected.business_name}`)
    const win = window.open('', '_blank', 'noopener')
    if (win) {
      win.document.open()
      win.document.write(fullHtml)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    }
  }, [mjrResult, selected])

  const copyFullHTML = useCallback(() => {
    if (!mjrResult?.html || !selected) return
    const fullHtml = wrapWithStyles(mjrResult.html, MJR_STYLES, `MJR — ${selected.business_name}`)
    navigator.clipboard.writeText(fullHtml).then(() => {
      toast('Full HTML copied to clipboard ✓', 'success')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [mjrResult, selected, toast])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="sprint-panel"
      style={{
        gap: 24,
        minHeight: 0,
      }}
    >
      {/* ── Sidebar — Prospect Explorer ───────────────────────────────────── */}
      <aside
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={14} color="var(--teal)" />
          <span className="section-label" style={{ marginBottom: 0 }}>
            Prospect Explorer
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'DM Mono, monospace',
              fontSize: 10,
              color: 'var(--grey)',
            }}
          >
            {filteredProspects.length}
          </span>
        </div>

        {/* Search */}
        <input
          className="input"
          placeholder="Search name, suburb, sector…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 13 }}
        />

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {filteredProspects.length === 0 && (
            <p
              style={{
                color: 'var(--grey)',
                fontSize: 12,
                textAlign: 'center',
                paddingTop: 32,
              }}
            >
              No prospects found
            </p>
          )}
          {filteredProspects.map((p) => {
            const isActive = selected?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => handleSelectProspect(p)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isActive ? 'var(--teal-faint, rgba(0,201,167,0.08))' : 'var(--bg3, #222)',
                  border: `1px solid ${isActive ? 'var(--teal)' : 'var(--border2, #2a2a2a)'}`,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--white)',
                    marginBottom: 2,
                  }}
                >
                  {p.business_name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--grey)',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  {[p.suburb, p.vertical].filter(Boolean).join(' · ')}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Main Workspace ────────────────────────────────────────────────── */}
      <main style={{ overflowY: 'auto', minHeight: 0 }}>
        {/* Empty state */}
        {!selected && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 16,
              color: 'var(--grey)',
            }}
          >
            <Target size={48} color="var(--border2, #2a2a2a)" strokeWidth={1} />
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 24,
                color: 'var(--white)',
                fontStyle: 'italic',
              }}
            >
              Ready for Generation
            </h2>
            <p style={{ fontSize: 13 }}>
              Select a prospect from the sidebar to begin the digital audit.
            </p>
          </div>
        )}

        {/* Workspace */}
        {selected && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* ── Control Bar ─────────────────────────────────────────── */}
            <div
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <h1
                  style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: 26,
                    fontStyle: 'italic',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {selected.business_name}
                </h1>
                <p
                  style={{
                    color: 'var(--grey)',
                    fontSize: 11,
                    fontFamily: 'DM Mono, monospace',
                    marginTop: 4,
                  }}
                >
                  {[selected.suburb, selected.vertical]
                    .filter(Boolean)
                    .join('  //  ')}
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={generateMJR}
                disabled={generating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 160,
                  justifyContent: 'center',
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? (
                  <>
                    <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    Researching…
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    Generate MJR
                  </>
                )}
              </button>
            </div>

            {/* ── Error Banner ─────────────────────────────────────────── */}
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(255,68,68,0.08)',
                  border: '1px solid rgba(255,68,68,0.3)',
                  borderRadius: 8,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <AlertCircle
                  size={16}
                  color="#FF4444"
                  style={{ marginTop: 1, flexShrink: 0 }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 10,
                      color: '#FF4444',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: 4,
                    }}
                  >
                    Generation Failed
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--white)' }}>
                    {errorMsg}
                  </div>
                </div>
              </div>
            )}

            {/* ── Generating Indicator ──────────────────────────────────── */}
            {generating && (
              <div
                className="card"
                style={{
                  padding: 32,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <Loader
                  size={32}
                  color="var(--teal)"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: 18,
                      fontStyle: 'italic',
                      marginBottom: 8,
                    }}
                  >
                    Researching {selected.business_name}…
                  </div>
                  <div
                    style={{
                      color: 'var(--grey)',
                      fontSize: 12,
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    Auditing competitors in {selected.suburb ?? 'Cape Town'} ·
                    Calculating revenue gaps · Building report
                  </div>
                </div>
              </div>
            )}

            {/* ── Idle Context Panel (pre-generation) ──────────────────── */}
            {!generating && !mjrResult && !errorMsg && (
              <div className="card" style={{ padding: 24 }}>
                <span className="section-label">Current Audit Context</span>
                <AuditRow
                  label="Google Reviews"
                  value={selected.google_review_count ?? 0}
                />
                <AuditRow
                  label="Star Rating"
                  value={selected.google_rating ?? 0}
                />
                <AuditRow
                  label="Meta Ads Running"
                  value={!!selected.has_meta_ads}
                />
                <AuditRow
                  label="Instagram"
                  value={selected.instagram_handle ? 'Active' : 'Missing'}
                />
                {selected.suburb && (
                  <AuditRow label="Location" value={selected.suburb} />
                )}
                {selected.vertical && (
                  <AuditRow label="Sector" value={selected.vertical} />
                )}
              </div>
            )}

            {/* ── Generated Report UI ───────────────────────────────────── */}
            {!generating && mjrResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Stats row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                  }}
                >
                  <StatCard
                    value={mjrResult.preview_stats.estimated_missed}
                    label="Est. Missed / Month"
                    colour="var(--red, #FF4444)"
                  />
                  <StatCard
                    value={mjrResult.preview_stats.annual_ltv}
                    label="Annual LTV Potential"
                    colour="var(--teal)"
                  />
                  <StatCard
                    value={mjrResult.preview_stats.job_value_range}
                    label="Avg Job Value Range"
                  />
                </div>

                {/* Additional signal badges */}
                <div
                  className="card"
                  style={{
                    padding: '14px 20px',
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <CheckCircle size={14} color="var(--teal)" />
                  <span
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 10,
                      color: 'var(--teal)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Report Ready
                  </span>
                  <span style={{ margin: '0 4px', color: 'var(--border2)' }}>|</span>
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>
                    {mjrResult.preview_stats.geography} ·{' '}
                    {mjrResult.preview_stats.sector}
                  </span>
                  <span style={{ margin: '0 4px', color: 'var(--border2)' }}>|</span>
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>
                    {mjrResult.preview_stats.google_reviews} reviews
                  </span>
                  <span style={{ margin: '0 4px', color: 'var(--border2)' }}>|</span>
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>
                    Instagram:{' '}
                    <span
                      style={{
                        color: mjrResult.preview_stats.has_instagram
                          ? 'var(--teal)'
                          : '#FF4444',
                      }}
                    >
                      {mjrResult.preview_stats.has_instagram ? 'Active' : 'Missing'}
                    </span>
                  </span>
                </div>

                {/* Action bar */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={printReport}
                  >
                    <Printer size={14} />
                    Save as PDF
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => setShowPreview((v) => !v)}
                  >
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px' }}
                    onClick={downloadHTML}
                    title="Download .html file"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 44 }}
                    onClick={copyFullHTML}
                    title="Copy full HTML to clipboard"
                  >
                    {copied ? <CheckCircle size={14} color="var(--teal)" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Inline Iframe Preview */}
                {showPreview && (
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border2)', marginTop: 8 }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border2)', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Live Document Preview
                    </div>
                    <ReportIframe html={wrapWithStyles(mjrResult.html, MJR_STYLES, `MJR — ${selected.business_name}`)} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Spinner keyframe — injected once, scoped to this component's output */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
