import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Client, Prospect } from '../lib/supabase'
import { formatRand, formatDate } from '../lib/utils'
import { Plus, X, AlertTriangle, TrendingUp, Search } from 'lucide-react'
import { useToast } from '../lib/toast'
import { useAuth } from '../lib/auth'
import ClientSprintManager from '../components/ClientSprintManager'
import DeliveryMetricsPanel from '../components/DeliveryMetricsPanel'

// Constants aligned with SQL CHECK constraints
const TIERS = [
  { value: 'Proof Sprint',     label: 'Proof Sprint',     setup: 15000, retainer: 8000 },
  { value: 'Proof Brand',      label: 'Proof Brand',      setup: 18000, retainer: 10000 },
  { value: 'Authority Brand',  label: 'Authority Brand',  setup: 25000, retainer: 17000 },
  { value: 'Consulting',       label: 'Consulting',       setup: 0,     retainer: 5000 },
]

type SlideTab = 'overview' | 'sprints' | 'proof-brand' | 'authority-brand' | 'notes'

export default function Clients() {
  const { role, metadata_id }         = useAuth()
  const navigate                      = useNavigate()
  const [clients, setClients]         = useState<Client[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Client | null>(null)
  const [slideTab, setSlideTab]       = useState<SlideTab>('overview')
  const [showNew, setShowNew]         = useState(false)
  const [importProspect, setImportProspect] = useState<Prospect | null>(null)
  const [deliveryUsers]   = useState<{ id: string; email: string }[]>([])
  const { toast }                     = useToast()
  const location                      = useLocation()

  useEffect(() => {
    load()
    if (location.state?.importProspect) {
      setImportProspect(location.state.importProspect)
      setShowNew(true)
    }
    // NOTE: Growth Operator dropdown requires a staff table.
    // profiles table is deprecated. deliveryUsers stays empty until staff table is provisioned.
  }, [metadata_id, role])

  useEffect(() => {
    const state = location.state as any
    if (!state?.openClientId || clients.length === 0) return
    const client = clients.find(c => c.id === state.openClientId)
    if (!client) return
    setSelected(client)
    setSlideTab(state.openClientTab || 'overview')
    navigate(location.pathname, { replace: true, state: {} })
  }, [clients, location.pathname, location.state, navigate])

  async function load() {
    setLoading(true)
    let q = supabase.from('clients').select('*').order('created_at', { ascending: false })

    // Delivery Ops: Filter by assigned UUID
    if (role === 'delivery' && metadata_id) {
      q = q.eq('account_manager', metadata_id)
    }
    
    // Client Dashboard: Filter by their own ID
    if (role === 'client' && metadata_id) {
      q = q.eq('id', metadata_id)
    }

    const { data } = await q
    setClients(data || [])
    setLoading(false)
  }

  async function createClient(form: any, prospectId?: string) {
    const insertData: any = { ...form, status: 'active', prospect_id: prospectId || null }
    
    // Auto-assign to the creator if they are a delivery user
    if (role === 'delivery' && metadata_id) {
      insertData.account_manager = metadata_id
    }

    const { data, error } = await supabase.from('clients').insert(insertData).select().single()
    if (error || !data) { 
        console.error(error)
        toast('Failed to create client. Check tier casing.', 'error')
        return 
    }

    if (prospectId) {
      await supabase.from('prospects').update({ status: 'closed_won' }).eq('id', prospectId)
    }

    setClients(prev => [data, ...prev])
    setShowNew(false)
    setImportProspect(null)
    toast('Client added ✓')
  }

  async function saveField(id: string, field: string, value: any) {
  // 1. Basic Validation
  if (field === 'tier' && !value) {
    toast("Please select a valid tier", "error");
    return;
  }

  // 2. Perform the update
  // We use .select() to get the updated data back, but handle it as an array to avoid the "single object" error
  const { data, error } = await supabase
    .from('clients')
    .update({ [field]: value })
    .eq('id', id)
    .select();

  if (error) {
    console.error("Update failed:", error);
    toast(`Failed to save: ${error.message}`, 'error');
    return;
  }

  // 3. Update the local state
  if (data && data.length > 0) {
    const updatedClient = data[0];
    setClients(prev => prev.map(c => c.id === id ? updatedClient : c));
    setSelected(updatedClient);
    toast(`${field} updated ✓`);
  } else {
    // If update worked but no data came back (common with some RLS setups)
    // We manually update the local state so the UI stays snappy
    setClients(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
    if (selected && selected.id === id) {
      setSelected({ ...selected, [field]: value });
    }
    toast(`${field} saved ✓`);
  }
}

  async function toggleFlag(id: string, field: 'churn_risk_flag' | 'upsell_ready_flag', current: boolean) {
    await saveField(id, field, !current)
  }

  const active      = clients.filter(c => c.status === 'active')
  const mrr         = active.reduce((sum, c) => sum + (c.monthly_retainer || 0), 0)
  const churnRisk   = active.filter(c => c.churn_risk_flag).length
  const upsellReady = active.filter(c => c.upsell_ready_flag).length

  return (
    <div>
      {/* Stats Bar */}
      <div className="stats-grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Active Clients', value: active.length,   sub: 'on retainer' },
          { label: 'Monthly MRR',    value: formatRand(mrr), sub: 'combined retainers' },
          { label: 'Churn Risk',     value: churnRisk,       sub: 'needs attention',            color: churnRisk > 0 ? 'var(--red)' : undefined },
          { label: 'Upsell Ready',   value: upsellReady,     sub: 'authority candidates',       color: upsellReady > 0 ? 'var(--amber)' : undefined },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="label">{s.label}</div>
            <div className="stat-num" style={{ fontSize: 26, marginTop: 8, color: s.color || 'var(--teal)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, fontFamily: 'DM Mono' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-label" style={{ margin: 0 }}>Active Accounts</div>
        {role !== 'client' && (
          <button className="btn-primary" onClick={() => { setImportProspect(null); setShowNew(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} /> Add Client
          </button>
        )}
      </div>

      {loading
        ? <div className="cards-grid-3">
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
          </div>
        : clients.length === 0
          ? (
            <div className="empty-state">
              <h3>No clients yet</h3>
              <p>Add your first client manually or convert a prospect using "Convert to Client".</p>
              {role !== 'client' && <button className="btn-primary" onClick={() => setShowNew(true)}>Add First Client</button>}
            </div>
          )
          : (
            <div className="cards-grid-3">
              {clients.map(c => (
                <div key={c.id} className="card"
                  onClick={() => { setSelected(c); setSlideTab('overview') }}
                  style={{ cursor: 'pointer', borderTop: `2px solid ${c.churn_risk_flag ? 'var(--red)' : c.upsell_ready_flag ? 'var(--amber)' : 'var(--teal)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{c.business_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>{c.owner_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.churn_risk_flag && <AlertTriangle size={14} color="var(--red)" />}
                      {c.upsell_ready_flag && <TrendingUp size={14} color="var(--amber)" />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {c.tier || '—'}
                    </span>
                    <span className={`badge ${c.status === 'active' ? 'badge-clients' : c.status === 'churned' ? 'badge-lost' : 'badge-new'}`}>{c.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border2)' }}>
                    <div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--grey)' }}>Retainer</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 14, color: 'var(--teal)' }}>{formatRand(c.monthly_retainer)}/mo</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--grey)' }}>Since</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--white)' }}>{formatDate(c.contract_start_date || c.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {/* Slide-over Detail View */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setSelected(null)} style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
          <div className="slide-over-panel" style={{ background: 'var(--bg2)', borderLeft: '1px solid var(--border2)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{selected.business_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)' }}>{selected.owner_name}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {role === 'admin' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button onClick={() => toggleFlag(selected.id, 'churn_risk_flag', !!selected.churn_risk_flag)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Mono', border: `1px solid ${selected.churn_risk_flag ? 'var(--red)' : 'var(--border2)'}`, background: selected.churn_risk_flag ? 'rgba(226,75,74,0.1)' : 'transparent', color: selected.churn_risk_flag ? 'var(--red)' : 'var(--grey)' }}>
                    <AlertTriangle size={11} /> Churn Risk
                  </button>
                  <button onClick={() => toggleFlag(selected.id, 'upsell_ready_flag', !!selected.upsell_ready_flag)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Mono', border: `1px solid ${selected.upsell_ready_flag ? 'var(--amber)' : 'var(--border2)'}`, background: selected.upsell_ready_flag ? 'rgba(239,159,39,0.1)' : 'transparent', color: selected.upsell_ready_flag ? 'var(--amber)' : 'var(--grey)' }}>
                    <TrendingUp size={11} /> Upsell Ready
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', borderBottom: '1px solid var(--border2)' }}>
                {([
                  ['overview', 'Overview'],
                  ['sprints', 'Sprint Data'],
                  ['proof-brand', 'Proof Brand'],
                  ['authority-brand', 'Authority Brand'],
                  ['notes', 'Notes'],
                ] as [SlideTab, string][]).map(([t, label]) => (
                  <button key={t} onClick={() => setSlideTab(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 16px', color: slideTab === t ? 'var(--teal)' : 'var(--grey)', borderBottom: slideTab === t ? '2px solid var(--teal)' : '2px solid transparent', marginBottom: -1 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {slideTab === 'overview' && (
                <>
                  <div className="section-label">Contact Details</div>
                  <div className="form-grid-2">
                    <CF label="Business Name" field="business_name" value={selected.business_name} onSave={v => saveField(selected.id, 'business_name', v)} />
                    <CF label="Owner Name" field="owner_name" value={selected.owner_name} onSave={v => saveField(selected.id, 'owner_name', v)} />
                    <CF label="Phone" field="phone" value={selected.phone} onSave={v => saveField(selected.id, 'phone', v)} />
                    <CF label="WhatsApp" field="whatsapp" value={selected.whatsapp} onSave={v => saveField(selected.id, 'whatsapp', v)} />
                    <CF label="Email" field="email" value={selected.email} onSave={v => saveField(selected.id, 'email', v)} type="email" />
                  </div>

                  {role !== 'client' && (
                    <>
                      <div className="section-label" style={{ marginTop: 8 }}>Contract & Tier</div>
                      <div className="form-grid-2">
                        <div>
                          <div className="label">Fulfillment Tier</div>
                          <select className="input" value={selected.tier || ''}
                            onChange={e => saveField(selected.id, 'tier', e.target.value)}>
                            <option value="">Select tier</option>
                            {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="label">Client Status</div>
                          <select className="input" value={selected.status ?? ''}
                            onChange={e => saveField(selected.id, 'status', e.target.value)}>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="churned">Churned</option>
                            <option value="upsold">Upsold</option>
                          </select>
                        </div>
                        <CF label="Setup Fee (R)" field="setup_fee" value={selected.setup_fee} onSave={v => saveField(selected.id, 'setup_fee', Number(v))} type="number" />
                        <CF label="Monthly Retainer (R)" field="monthly_retainer" value={selected.monthly_retainer} onSave={v => saveField(selected.id, 'monthly_retainer', Number(v))} type="number" />
                        <CF label="Ad Spend Budget (R)" field="monthly_ad_spend" value={selected.monthly_ad_spend} onSave={v => saveField(selected.id, 'monthly_ad_spend', Number(v))} type="number" />
                        <div>
                          <div className="label">Contract Start</div>
                          <input className="input" type="date" defaultValue={selected.contract_start_date || ''} onBlur={e => saveField(selected.id, 'contract_start_date', e.target.value)} />
                        </div>
                      </div>

                      <div className="section-label" style={{ marginTop: 8 }}>Internal Operations</div>
                      <div className="form-grid-2">
                        <CF label="Meta Ad Account ID" field="meta_ad_account_id" value={selected.meta_ad_account_id} onSave={v => saveField(selected.id, 'meta_ad_account_id', v)} placeholder="act_..." />
                        <div>
                          <div className="label">Growth Operator</div>
                          <select className="input" value={selected.account_manager || ''}
                            onChange={e => saveField(selected.id, 'account_manager', e.target.value)}>
                            <option value="">— Unassigned —</option>
                            {deliveryUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.email}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {slideTab === 'sprints' && <ClientSprintManager clientId={selected.id} clientName={selected.business_name} />}

              {slideTab === 'proof-brand' && (
                <DeliveryMetricsPanel
                  title="Proof Brand Daily Data"
                  subtitle="Log daily proof-brand pipeline metrics that flow into the live client dashboard."
                  clientId={selected.id}
                />
              )}

              {slideTab === 'authority-brand' && (
                <DeliveryMetricsPanel
                  title="Authority Brand Daily Tracking"
                  subtitle="Log daily authority-brand pipeline metrics that flow into the live client dashboard."
                  clientId={selected.id}
                />
              )}

              {slideTab === 'notes' && (
                <div>
                  <div className="label">Account Notes</div>
                  <textarea className="input" rows={16}
                    placeholder="Strategy notes, client goals, and specific delivery constraints..."
                    defaultValue={selected.notes || ''}
                    onBlur={e => saveField(selected.id, 'notes', e.target.value)}
                    style={{ resize: 'vertical', lineHeight: 1.7 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNew && role !== 'client' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => { setShowNew(false); setImportProspect(null) }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'relative', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 32, width: '100%', maxWidth: 500, zIndex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 700 }}>Initialize Client</div>
              <button onClick={() => { setShowNew(false); setImportProspect(null) }} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <NewClientForm
              initialProspect={importProspect}
              onSave={createClient}
              onCancel={() => { setShowNew(false); setImportProspect(null) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function CF({ label, field, value, onSave, type = 'text', placeholder = '' }: {
  label: string
  field: string
  value: any
  onSave: (v: string) => void
  type?: string
  placeholder?: string
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

function NewClientForm({ initialProspect, onSave, onCancel }: {
  initialProspect?: Prospect | null
  onSave: (form: any, prospectId?: string) => void
  onCancel: () => void
}) {
  const [mode, setMode]             = useState<'manual' | 'import'>(initialProspect ? 'import' : 'manual')
  const [prospects, setProspects]   = useState<Prospect[]>([])
  const [search, setSearch]         = useState('')
  const [pickedProspect, setPickedProspect] = useState<Prospect | null>(initialProspect || null)
  const [form, setForm]             = useState({
    business_name:       initialProspect?.business_name || '',
    owner_name:          initialProspect?.owner_name    || '',
    phone:               initialProspect?.phone         || '',
    whatsapp:            initialProspect?.whatsapp      || '',
    email:               initialProspect?.email         || '',
    tier:                'Proof Brand', 
    setup_fee:           18000,
    monthly_retainer:    10000,
    monthly_ad_spend:    5000,
    contract_start_date: new Date().toISOString().split('T')[0],
    meta_ad_account_id:  '',
    account_manager:     null,
  })

  async function searchProspects(q: string) {
    setSearch(q)
    if (q.length < 2) { setProspects([]); return }
    const { data } = await supabase.from('prospects').select('*')
      .or(`business_name.ilike.%${q}%,owner_name.ilike.%${q}%`)
      .neq('status', 'closed_won')
      .limit(6)
    setProspects(data || [])
  }

  function selectProspect(p: Prospect) {
    setPickedProspect(p)
    setForm(prev => ({
      ...prev,
      business_name: p.business_name,
      owner_name:    p.owner_name || '',
      phone:         p.phone      || '',
      whatsapp:      p.whatsapp   || '',
      email:         p.email      || '',
    }))
    setProspects([])
    setSearch(p.business_name)
  }

  function onTierChange(tier: string) {
    const t = TIERS.find(x => x.value === tier)!
    setForm(prev => ({ ...prev, tier, setup_fee: t.setup, monthly_retainer: t.retainer }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 8, padding: 4, marginBottom: 8 }}>
        {(['manual','import'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', background: mode === m ? 'var(--teal)' : 'transparent', color: mode === m ? 'var(--bg)' : 'var(--grey)', transition: 'all 0.2s' }}>
            {m === 'manual' ? 'Manual' : 'Import'}
          </button>
        ))}
      </div>

      {mode === 'import' && (
        <div style={{ marginBottom: 12 }}>
          <div className="label">Prospect Source</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--grey2)' }} />
            <input className="input" placeholder="Search by business or name..."
              style={{ paddingLeft: 38 }} value={search}
              onChange={e => searchProspects(e.target.value)} />
          </div>
          {prospects.length > 0 && (
            <div style={{ border: '1px solid var(--border2)', borderRadius: 8, marginTop: 8, background: 'var(--bg3)', maxHeight: 200, overflowY: 'auto' }}>
              {prospects.map(p => (
                <div key={p.id} onClick={() => selectProspect(p)}
                  style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border2)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.business_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>{p.owner_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="form-grid-2">
        <div>
          <div className="label">Business Name *</div>
          <input className="input" value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} />
        </div>
        <div>
          <div className="label">Owner Name *</div>
          <input className="input" value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} />
        </div>
      </div>

      <div>
        <div className="label">Fulfillment Tier</div>
        <select className="input" value={form.tier} onChange={e => onTierChange(e.target.value)}>
          {TIERS.map(t => <option key={t.value} value={t.value}>{t.label} — R{t.setup.toLocaleString()}</option>)}
        </select>
      </div>

      <div className="form-grid-2">
        <div>
          <div className="label">Contract Start</div>
          <input className="input" type="date" value={form.contract_start_date} onChange={e => setForm(p => ({ ...p, contract_start_date: e.target.value }))} />
        </div>
        <div>
          <div className="label">Ad Account ID</div>
          <input className="input" placeholder="act_..." value={form.meta_ad_account_id} onChange={e => setForm(p => ({ ...p, meta_ad_account_id: e.target.value }))} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button className="btn-primary" style={{ flex: 1, padding: '14px' }}
          disabled={!form.business_name || !form.owner_name}
          onClick={() => onSave(form, pickedProspect?.id)}>
          Onboard Client →
        </button>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Discard</button>
      </div>
    </div>
  )
}
