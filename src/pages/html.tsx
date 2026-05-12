import { useState, useCallback, useMemo } from 'react';
import { useToast } from '../lib/toast';
import { Download, Loader2, Printer, Copy, Code, Zap } from 'lucide-react';
import { MJR_STYLES, wrapWithStyles } from '../lib/docStyles';

// ─── SPOA Ref # derived from business name (deterministic, no server needed) ──
function computeSpoaRef(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
  const hash = (name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 137 % 9999)
    .toString()
    .padStart(4, '0')
  return `${slug}-${hash}`
}

export default function MJRPdfGenerator() {
  const [htmlInput, setHtmlInput] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const spoaRef = useMemo(
    () => (businessName.trim() ? computeSpoaRef(businessName) : null),
    [businessName],
  )

  const fullHtml = useMemo(
    () => (htmlInput.trim()
      ? wrapWithStyles(htmlInput, MJR_STYLES, businessName || 'Document')
      : ''),
    [htmlInput, businessName],
  )

  // ── Server PDF (headless renderer) ──────────────────────────────────────────
  const handleGeneratePDF = async () => {
    if (!htmlInput || !businessName) {
      toast('Please provide both HTML source and Business Name', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(
        'https://ideal-doodle-4jxv9qqx6qq6cvp5-3001.app.github.dev/generate-pdf',
        {
          method: 'POST',
          mode: 'cors',
          referrerPolicy: 'no-referrer',
          headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
          body: JSON.stringify({ html: fullHtml, businessName }),
        },
      );
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MJR_${businessName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast('MJR PDF generated successfully ✓', 'success');
    } catch (err) {
      console.error('[AA-OS] PDF Error:', err);
      toast(err instanceof Error ? err.message : 'Generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Print / PDF (browser print dialog) ──────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (!fullHtml) { toast('Paste HTML source first', 'error'); return; }
    const win = window.open('', '_blank', 'noopener');
    if (win) {
      win.document.open();
      win.document.write(fullHtml);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }, [fullHtml, toast]);

  // ── Download .html ───────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!fullHtml || !businessName) {
      toast('Fill in Business Name and HTML source first', 'error');
      return;
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MJR_${businessName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('HTML downloaded ✓', 'success');
  }, [fullHtml, businessName, toast]);

  // ── Copy to clipboard ────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!fullHtml) { toast('Paste HTML source first', 'error'); return; }
    navigator.clipboard.writeText(fullHtml).then(() =>
      toast('Full HTML copied to clipboard ✓', 'success'),
    );
  }, [fullHtml, toast]);

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const glass: React.CSSProperties = {
    background: 'rgba(10, 12, 11, 0.82)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(0, 201, 167, 0.14)',
    borderRadius: 12,
    boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(0,201,167,0.08)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 100px)' }}>
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 0.45; transform: scale(0.82); box-shadow: 0 0 6px #00C9A7; }
          50%       { opacity: 1;    transform: scale(1.18); box-shadow: 0 0 14px #00C9A7; }
        }
        .forge-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(0,201,167,0.18);
          border-radius: 8px;
          color: #E8E8E8;
          font-family: inherit;
          font-size: 14px;
          padding: 12px 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .forge-input:focus {
          border-color: rgba(0,201,167,0.5);
          box-shadow: 0 0 0 3px rgba(0,201,167,0.08);
        }
        .forge-input::placeholder { color: rgba(255,255,255,0.2); }
        .forge-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(0,201,167,0.7);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 7px;
          display: block;
        }
        .icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 42px; height: 42px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(0,201,167,0.18);
          color: rgba(0,201,167,0.75);
          cursor: pointer;
          transition: all 0.15s;
        }
        .icon-btn:hover {
          background: rgba(0,201,167,0.1);
          border-color: rgba(0,201,167,0.45);
          color: #00C9A7;
        }
      `}</style>

      {/* ── Command Center Header ─────────────────────────────────────────────── */}
      <div style={{
        ...glass,
        borderRadius: 10,
        padding: '13px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Left: status + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#00C9A7',
              animation: 'pulse-live 2.2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'DM Mono', fontSize: 11,
              color: '#00C9A7', letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              Live System Active
            </span>
          </div>

          <div style={{ width: 1, height: 18, background: 'rgba(0,201,167,0.2)' }} />

          <div>
            <span style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 700, color: '#E8E8E8' }}>
              Document Forge
            </span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 10 }}>
              v2.4
            </span>
          </div>
        </div>

        {/* Right: SPOA Ref # pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {spoaRef ? (
            <div style={{
              padding: '5px 14px',
              background: 'rgba(0,201,167,0.08)',
              border: '1px solid rgba(0,201,167,0.28)',
              borderRadius: 6,
              fontFamily: 'DM Mono', fontSize: 11,
              color: '#00C9A7', letterSpacing: '0.1em',
            }}>
              SPOA Ref # {spoaRef}
            </div>
          ) : (
            <div style={{
              padding: '5px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              fontFamily: 'DM Mono', fontSize: 11,
              color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em',
            }}>
              SPOA Ref # ——
            </div>
          )}
        </div>
      </div>

      {/* ── Main Body: two-column ────────────────────────────────────────────── */}
      <div className="sprint-panel" style={{ gap: 20, flex: 1, minHeight: 0 }}>

        {/* ── Left: Inputs + Actions ─────────────────────────────────────────── */}
        <div style={{ ...glass, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>

          {/* Business Name */}
          <div>
            <label className="forge-label">Target Business Entity</label>
            <input
              type="text"
              className="forge-input"
              placeholder="e.g. Line & Light Electrical"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
            />
          </div>

          {/* HTML Source */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label className="forge-label" style={{ margin: 0 }}>Raw HTML Payload</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'DM Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                <Code size={11} /> UTF-8 · auto-wrapped with MJR_STYLES
              </div>
            </div>
            <textarea
              className="forge-input"
              style={{
                flex: 1,
                fontFamily: 'DM Mono',
                fontSize: 12,
                lineHeight: 1.65,
                resize: 'none',
                padding: 16,
                color: 'rgba(0,201,167,0.8)',
              }}
              placeholder="Paste naked HTML body content here..."
              value={htmlInput}
              onChange={e => setHtmlInput(e.target.value)}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              style={{
                flex: 1,
                height: 42,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                borderRadius: 8,
                background: isGenerating ? 'rgba(0,201,167,0.06)' : 'rgba(0,201,167,0.15)',
                border: `1px solid ${isGenerating ? 'rgba(0,201,167,0.2)' : 'rgba(0,201,167,0.5)'}`,
                color: isGenerating ? 'rgba(0,201,167,0.45)' : '#00C9A7',
                fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.1em',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {isGenerating ? (
                <><Loader2 size={14} className="spin" /> COMPILING...</>
              ) : (
                <><Zap size={14} /> GENERATE PDF</>
              )}
            </button>

            <button className="icon-btn" onClick={handlePrint} title="Print / Save as PDF">
              <Printer size={15} />
            </button>
            <button className="icon-btn" onClick={handleDownload} title="Download .html file">
              <Download size={15} />
            </button>
            <button className="icon-btn" onClick={handleCopy} title="Copy full HTML to clipboard">
              <Copy size={15} />
            </button>
          </div>

          <p style={{
            fontFamily: 'DM Mono', fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            margin: 0, lineHeight: 1.5,
          }}>
            PDF button triggers headless renderer · Print/Download/Copy use browser-native pipeline with forced dark-theme CSS.
          </p>
        </div>

        {/* ── Right: Live Preview ────────────────────────────────────────────── */}
        <div style={{
          ...glass,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Preview chrome bar */}
          <div style={{
            padding: '10px 18px',
            background: 'rgba(0,201,167,0.05)',
            borderBottom: '1px solid rgba(0,201,167,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'DM Mono', fontSize: 10,
              color: 'rgba(0,201,167,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              Live Preview · MJR_STYLES Applied
            </span>
            {fullHtml && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#00C9A7',
                  boxShadow: '0 0 6px #00C9A7',
                }} />
                <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#00C9A7' }}>
                  Rendering
                </span>
              </div>
            )}
          </div>

          {/* iframe or empty state */}
          {fullHtml ? (
            <iframe
              key={fullHtml.length}
              srcDoc={fullHtml}
              title="Document Preview"
              style={{ flex: 1, border: 'none', display: 'block', background: '#0A0C0B' }}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(0,201,167,0.06)',
                border: '1px solid rgba(0,201,167,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Code size={20} style={{ color: 'rgba(0,201,167,0.4)' }} />
              </div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                Paste HTML source to<br />render live preview
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
