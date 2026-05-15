import { useEffect, useState, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { formatRand, monthLabel } from '../lib/utils'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

// 1. Updated interface to match your ACTUAL database columns
interface FinancialRow {
  id: string;
  month: string;
  gross_mrr: number | null;
  schedule_d_mrr_target: number | null;
  ad_infrastructure_costs: number | null;
  va_costs: number | null;
  software_costs: number | null;
  other_costs: number | null;
  personal_cash_balance: number | null;
}

export default function Finance() {
  const [rows, setRows]         = useState<FinancialRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    // financial_snapshots is the canonical COS monthly finance table.
    // monthly_revenue is an AICOS aggregate VIEW over finance_ledger — different purpose.
    ;(supabase as any).from('financial_snapshots').select('*').order('month').then(({ data }: { data: any }) => {
      setRows((data as any) || [])
      setLoading(false)
    })
  }, [])

  // Helper to calculate total expenses from specific DB columns
  const getTotalExpenses = (r: FinancialRow) => {
    return (r.ad_infrastructure_costs || 0) + 
           (r.va_costs || 0) + 
           (r.software_costs || 0) + 
           (r.other_costs || 0);
  }

  const now = new Date()
  const currentMonth = rows.find(r => 
    r.month.startsWith(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  )

  const currentRev = currentMonth?.gross_mrr || 0
  const currentExp = currentMonth ? getTotalExpenses(currentMonth) : 0
  const currentProfit = currentRev - currentExp
  const currentMargin = currentRev > 0 ? Math.round((currentProfit / currentRev) * 100) : 0

  const chartData = rows.map(r => {
    const rev = r.gross_mrr || 0
    const exp = getTotalExpenses(r)
    return {
      month: monthLabel(r.month.slice(0,7)),
      Revenue: rev,
      Expenses: exp,
      Profit: rev - exp,
      Target: r.schedule_d_mrr_target || 0,
    }
  })

  return (
    <div>
      {/* Stat cards */}
      <div className="stats-grid-5" style={{ marginBottom: 28 }}>
        {[
          { label: 'Gross Revenue', value: currentRev, sub: `Target ${formatRand(currentMonth?.schedule_d_mrr_target || 0)}` },
          { label: 'Total Expenses', value: currentExp, sub: 'VAs + Ads + Software' },
          { label: 'Net Profit', value: currentProfit, sub: 'This month', color: currentProfit >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Profit Margin', value: currentMargin, sub: 'Target 60%+', isPct: true },
          { label: 'Cash Balance', value: currentMonth?.personal_cash_balance || 0, sub: 'Reserves' },
        ].map(c => (
          <div key={c.label} className="card">
            <span className="label">{c.label}</span>
            {loading ? (
              <div className="skeleton" style={{ height: 36, margin: '8px 0' }} />
            ) : (
              <div className="stat-num" style={{ fontSize: 24, marginTop: 8, color: c.color || 'inherit' }}>
                {c.isPct ? `${c.value}%` : formatRand(c.value)}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, fontFamily: 'DM Mono' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-label">Attract Acquisition Performance — Revenue vs Burn</div>
        {loading ? (
          <div className="skeleton" style={{ height: 320 }} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--grey)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `R${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'var(--grey)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any, n: any) => [formatRand(v), String(n)]}
                contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 4, fontFamily: 'DM Mono', fontSize: 12, color: 'var(--white)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'DM Mono', paddingTop: 10 }} />
              <Bar dataKey="Revenue" fill="var(--teal)" opacity={0.8} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="var(--red)" opacity={0.6} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Profit" stroke="var(--green)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="step" dataKey="Target" stroke="var(--grey2)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Variance table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border2)' }}>
          <div className="section-label" style={{ margin: 0 }}>Financial Ledger</div>
        </div>
        {loading ? (
          <div style={{ padding: 20 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8 }} />)}</div>
        ) : (
          <table className="aa-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Target MRR</th>
                <th>Actual Rev</th>
                <th>Total Burn</th>
                <th>Net Profit</th>
                <th>Margin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{rows.map(r => {
                const rev = r.gross_mrr || 0
                const exp = getTotalExpenses(r)
                const target = r.schedule_d_mrr_target || 0
                const profit = rev - exp
                const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0
                
                return (
                  <Fragment key={r.id}>
                    <tr onClick={() => setExpanded(expanded === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{monthLabel(r.month.slice(0,7))}</td>
                      <td style={{ color: 'var(--grey)' }}>{formatRand(target)}</td>
                      <td style={{ color: 'var(--teal)' }}>{rev ? formatRand(rev) : <span style={{ color: 'var(--grey2)' }}>—</span>}</td>
                      <td style={{ color: exp ? 'var(--red)' : 'var(--grey2)' }}>{exp ? formatRand(exp) : '—'}</td>
                      <td style={{ fontWeight: 500, color: profit > 0 ? 'var(--green)' : profit < 0 ? 'var(--red)' : 'var(--grey)' }}>
                        {rev ? formatRand(profit) : '—'}
                      </td>
                      <td style={{ fontFamily: 'DM Mono', fontSize: 13, color: margin >= 50 ? 'var(--green)' : margin > 0 ? 'var(--amber)' : 'var(--grey2)' }}>
                        {rev ? `${margin}%` : '—'}
                      </td>
                      <td>
                        <button className="btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}
                          onClick={e => { e.stopPropagation(); setExpanded(expanded === r.id ? null : r.id) }}>
                          {expanded === r.id ? 'Close' : 'Update'}
                        </button>
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--bg3)', padding: '20px', borderBottom: '1px solid var(--border2)' }}>
                          <MonthUpdateForm row={r} onSave={updated => {
                            setRows(prev => prev.map(x => x.id === updated.id ? updated : x))
                            setExpanded(null)
                          }} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MonthUpdateForm({ row, onSave }: { row: FinancialRow; onSave: (r: FinancialRow) => void }) {
  const [form, setForm] = useState({
    gross_mrr: row.gross_mrr || 0,
    schedule_d_mrr_target: row.schedule_d_mrr_target || 0,
    ad_infrastructure_costs: row.ad_infrastructure_costs || 0,
    va_costs: row.va_costs || 0,
    software_costs: row.software_costs || 0,
    other_costs: row.other_costs || 0,
    personal_cash_balance: row.personal_cash_balance || 0,
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { data, error } = await (supabase as any)
      .from('financial_snapshots')
      .update(form)
      .eq('id', row.id)
      .select()
      .single()
      
    setSaving(false)
    if (data && !error) onSave(data as any)
  }

  const fields = [
    ['Target MRR', 'schedule_d_mrr_target'],
    ['Gross Revenue', 'gross_mrr'],
    ['Ad Infrastructure', 'ad_infrastructure_costs'],
    ['VA Payroll', 'va_costs'],
    ['Software/SaaS', 'software_costs'],
    ['Other Admin', 'other_costs'],
    ['Cash Balance', 'personal_cash_balance'],
  ]

  return (
    <div>
      <div className="form-grid-4" style={{ marginBottom: 16 }}>
        {fields.map(([label, key]) => (
          <div key={key}>
            <div className="label" style={{ marginBottom: 6 }}>{label}</div>
            <input 
              className="input" 
              type="number" 
              value={(form as any)[key]}
              style={{ width: '100%' }}
              onChange={e => setForm(prev => ({ ...prev, [key]: Number(e.target.value) }))} 
            />
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Syncing Ledger...' : 'Update Monthly Financials →'}
      </button>
    </div>
  )
}