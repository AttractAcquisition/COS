import { useState } from 'react'
import { supabase, type Prospect } from '../../lib/supabase'
import { X, Trash2, Loader2, CheckCircle } from 'lucide-react'
import { useToast } from '../../lib/toast'
import { formatDate } from '../../lib/utils'

interface Props {
  prospect: Prospect
  onClose: () => void
  onUpdate: (updates: Partial<Prospect>) => void
  onDelete: (id: string) => void
}

const VERTICALS = [
  'Auto Detailing','Vehicle Wrapping','Car Wash', 'Pet Grooming','Pet Salon',
  'Trailer Manufacturing','Metal Fabrication','Engineering Shop','Home Renovation',
  'Landscaping','Plumbing','Electrical','HVAC','Courier','Logistics',
  'Physiotherapy','Wellness Studio','Dental Clinic','Personal Training',
  'Industrial','Other'
]

const PIPELINE_STAGES = [
  'First Touch', 'Positive Response', 'MJR Sent', 'Follow Up', 'Call Booked', 'Sprint Pitched', 'Sprint Booked'
]

const DATA_SOURCES = ['manual', 'apify', 'referral', 'inbound', 'google_maps']

type Tab = 'info' | 'digital' | 'qualification' | 'outreach'

export default function ProspectDetailView({ prospect, onClose, onUpdate, onDelete }: Props) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tab, setTab] = useState<Tab>('info')

  function calculateICP(p: any) {
    const score = (Number(p.score_visual_transformability) || 0) + 
                  (Number(p.score_ticket_size) || 0) + 
                  (Number(p.score_owner_accessibility) || 0) + 
                  (Number(p.score_digital_weakness) || 0) + 
                  (Number(p.score_growth_hunger) || 0)
    let tier = score >= 20 ? '★★★' : score >= 15 ? '★★' : score >= 10 ? '★' : ''
    return { score, tier }
  }

  async function updateField(field: keyof Prospect, value: any) {
    setIsSaving(true)
    const isScoreField = field.toString().startsWith('score_')
    const numericValue = (field.toString().includes('follower') || field.toString().includes('count') || isScoreField || field.toString().includes('revenue') || field.toString().includes('rating')) 
      ? (value === '' ? null : Number(value)) 
      : value

    let updates: any = { [field]: numericValue, updated_at: new Date().toISOString() }

    if (isScoreField) {
      const { score, tier } = calculateICP({ ...prospect, [field]: numericValue })
      updates.icp_total_score = score
      updates.icp_tier = tier
    }

    // TODO Phase 3: route through a patch-prospect AICOS Edge Function
    const { error } = await supabase.from('prospects').update(updates).eq('id', prospect.id)
    if (!error) { 
      onUpdate(updates)
      if (!isScoreField) toast('Saved ✓') 
    } else { 
      toast('Error saving', 'error') 
    }
    setIsSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${prospect.business_name}? This action cannot be undone.`)) return

    setIsDeleting(true)
    
    // Log for debugging
    console.log('Attempting to delete prospect ID:', prospect.id);

    const { error, status, statusText } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospect.id)

    if (error) {
      toast(`Error: ${error.message}`, 'error')
      console.error('Delete Error Detail:', error)
      setIsDeleting(false)
    } else {
      // If status is 204 or 200, it succeeded. 
      // If the row is still there, it's 100% an RLS Policy issue.
      console.log('Delete Response Status:', status, statusText)
      toast('Prospect deleted successfully')
      onDelete(prospect.id) 
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Dimmed Overlay matching Clients.tsx */}
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
      
      {/* Slide-over Panel matching Clients.tsx */}
      <div style={{ width: 560, background: 'var(--bg2)', borderLeft: '1px solid var(--border2)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
                <div style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700 }}>
                  {prospect.business_name || 'Unnamed Prospect'}
                </div>
                {(isSaving || isDeleting) && <Loader2 size={14} className="spin" style={{ color: 'var(--teal)' }} />}
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey)' }}>{prospect.owner_name || 'No Owner Listed'}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border2)' }}>
            {(['info', 'digital', 'qualification', 'outreach'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono', 
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 16px', 
                  color: tab === t ? 'var(--teal)' : 'var(--grey)', 
                  borderBottom: tab === t ? '2px solid var(--teal)' : '2px solid transparent', 
                  marginBottom: -1 
                }}>
                {t === 'info' ? 'Details' : t}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {tab === 'info' && (
            <>
              <div className="section-label">Core Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CF label="Business Name" field="business_name" value={prospect.business_name} onSave={v => updateField('business_name', v)} />
                <CF label="Owner Name" field="owner_name" value={prospect.owner_name} onSave={v => updateField('owner_name', v)} />
                <SelectF label="Vertical / Niche" value={prospect.vertical} options={VERTICALS} onSave={v => updateField('vertical', v)} />
              </div>

              <div className="section-label" style={{ marginTop: 8 }}>Contact & Location</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CF label="Phone" field="phone" value={prospect.phone} onSave={v => updateField('phone', v)} />
                <CF label="WhatsApp" field="whatsapp" value={prospect.whatsapp || prospect.phone} onSave={v => updateField('whatsapp', v)} />
                <CF label="Suburb" field="suburb" value={prospect.suburb} onSave={v => updateField('suburb', v)} />
                <CF label="Address" field="address" value={prospect.address} onSave={v => updateField('address', v)} />
              </div>

              <div className="section-label" style={{ marginTop: 8 }}>Pipeline Operations</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SelectF label="Pipeline Stage" value={prospect.pipeline_stage} options={PIPELINE_STAGES} onSave={v => updateField('pipeline_stage', v)} />
                <SelectF label="Data Source" value={prospect.data_source} options={DATA_SOURCES} onSave={v => updateField('data_source', v)} />
              </div>
            </>
          )}

          {tab === 'digital' && (
            <>
              <div className="section-label">Instagram Footprint</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CF label="IG Handle" field="instagram_handle" value={prospect.instagram_handle} onSave={v => updateField('instagram_handle', v)} />
                <CF label="Followers" field="ig_follower_count" value={prospect.ig_follower_count} type="number" onSave={v => updateField('ig_follower_count', v)} />
              </div>
              
              <div className="section-label" style={{ marginTop: 8 }}>Google & Meta</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CF label="Google Rating" field="google_rating" value={prospect.google_rating} type="number" onSave={v => updateField('google_rating', v)} />
                <CF label="Review Count" field="google_review_count" value={prospect.google_review_count} type="number" onSave={v => updateField('google_review_count', v)} />
              </div>
              <div style={{ marginTop: 8, padding: 16, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border2)' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: 'var(--white)', fontWeight: 500 }}>Meta Ads Active?</span>
                  <input type="checkbox" style={{ accentColor: 'var(--teal)', width: 16, height: 16 }} checked={!!prospect.meta_ads_running} onChange={e => updateField('meta_ads_running', e.target.checked)} />
                </label>
              </div>
            </>
          )}

          {tab === 'qualification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: 24, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border2)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'DM Mono' }}>ICP Rating</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--teal)', fontFamily: 'DM Mono' }}>
                  {prospect.icp_total_score ?? 0}<span style={{ color: 'var(--grey)', fontSize: 18 }}>/25</span>
                </div>
                <div style={{ color: 'var(--white)', marginTop: 4, fontSize: 14, fontWeight: 600 }}>{prospect.icp_tier || 'UNSCORED'}</div>
              </div>

              <div className="section-label">Scoring Metrics</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['score_visual_transformability', 'score_ticket_size', 'score_owner_accessibility', 'score_digital_weakness', 'score_growth_hunger'].map(f => (
                  <div key={f}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--grey)', textTransform: 'uppercase' }}>{f.replace(/score_|_/g, ' ')}</span>
                      <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--teal)' }}>{(prospect as any)[f] || 0}/5</span>
                    </div>
                    <input type="range" min={1} max={5} value={(prospect as any)[f] || 1} onChange={e => updateField(f as any, e.target.value)} style={{ width: '100%', accentColor: 'var(--teal)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'outreach' && (
            <>
              <div className="section-label">Strategy & Assets</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <CF label="Est. Missed Revenue (ZAR)" field="mjr_missed_revenue" value={prospect.mjr_missed_revenue} type="number" onSave={v => updateField('mjr_missed_revenue', v)} />
                <CF label="MJR Loom Link" field="mjr_link" value={prospect.mjr_link} onSave={v => updateField('mjr_link', v)} placeholder="https://loom.com/..." />
              </div>
              
              <div className="section-label" style={{ marginTop: 8 }}>WhatsApp Sequence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['msg_1_sent', 'msg_2_sent', 'msg_3_sent', 'msg_4_sent', 'msg_5_sent'].map((k, i) => {
                  const isChecked = !!(prospect as any)[k]
                  return (
                    <label key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg3)', border: `1px solid ${isChecked ? 'var(--teal)' : 'var(--border2)'}`, borderRadius: 6, cursor: 'pointer', alignItems: 'center', transition: 'all 0.2s' }}>
                      <span style={{ fontSize: 13, color: isChecked ? 'var(--white)' : 'var(--grey)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isChecked ? <CheckCircle size={14} color="var(--teal)" /> : <span style={{ width: 14 }} />}
                        Msg {i+1}: {i === 0 ? 'Intro' : i === 1 ? 'Value Drop' : i === 2 ? 'MJR Drop' : i === 3 ? 'Sprint Pitch' : 'Follow Up'}
                      </span>
                      <input type="checkbox" style={{ accentColor: 'var(--teal)', width: 16, height: 16 }} checked={isChecked} onChange={e => updateField(k as any, e.target.checked)} />
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border2)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--red)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.5 : 1 }} 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={14} /> {isDeleting ? 'Deleting...' : 'Delete Prospect'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono', textAlign: 'right' }}>
            Last Update: {formatDate(prospect.updated_at || prospect.created_at)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable Field Components matching Clients.tsx exactly
function CF({ label, field, value, onSave, type = 'text', placeholder = '' }: {
  label: string; field: string; value: any; onSave: (v: string) => void
  type?: string; placeholder?: string
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <input className="input" type={type} placeholder={placeholder}
        defaultValue={value ?? ''}
        key={`${field}-${value}`}
        onBlur={e => { if (String(e.target.value) !== String(value ?? '')) onSave(e.target.value) }} />
    </div>
  )
}

function SelectF({ label, value, options, onSave }: { label: string, value: any, options: string[], onSave: (v: any) => void }) {
  return (
    <div>
      <div className="label">{label}</div>
      <select className="input" value={value || ''} onChange={e => onSave(e.target.value)}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  )
}