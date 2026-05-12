import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase' 

import { 
  DollarSign, 
  Filter, Plus, ArrowUpRight, 
  ArrowDownLeft, BarChart3, X
} from 'lucide-react'
import { useToast } from '../lib/toast'

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewType = 'monthly' | 'weekly' | 'daily'

// Using LedgerRow for internal mapping
type LedgerRow = Database['public']['Tables']['ledger']['Row']

// This ensures your local 'type' matches the DB Enum ('income' | 'expense')
export type Transaction = Omit<LedgerRow, 'type'> & { 
  type: Database["public"]["Enums"]["transaction_type"] 
}

const CATEGORIES = ['Ads', 'Software', 'Infrastructure', 'Content', 'Contractor', 'Setup Fee', 'Subscription']

// ─── Sub-Components ───────────────────────────────────────────────────────────
function StatCard({ title, amount, type }: { title: string; amount: number; type: 'income' | 'expense' | 'net' }) {
  const isNet = type === 'net'
  const color = type === 'income' || (isNet && amount >= 0) ? 'var(--teal)' : '#FF4444'
  const Icon = type === 'income' ? ArrowUpRight : type === 'expense' ? ArrowDownLeft : DollarSign

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase' }}>{title}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Playfair Display', color: 'var(--white)' }}>
        R {amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function IncomeTracking() {
  const [view, setView] = useState<ViewType>('monthly')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    type: 'income',
    category: 'Subscription',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchTransactions()
  }, [])

async function fetchTransactions() {
    setLoading(true)
    try {
      // Letting Supabase infer types from the client definition is cleaner
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error

      if (data) {
        // We cast the incoming data to our local Transaction type
        setTransactions(
          data.map(t => ({
            ...t,
            type: t.type as 'income' | 'expense',
          }))
        )
      } else {
        setTransactions([])
      }

    } catch (error: any) {
      toast(error.message || 'Failed to fetch transactions', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()

    try {
      // Extract the Enum type from your Database definition to ensure a perfect match
      type TransactionType = Database["public"]["Enums"]["transaction_type"]

      const { error } = await supabase
        .from('ledger')
        .insert([{
          amount: parseFloat(formData.amount),
          type: formData.type as TransactionType, // Cast to the specific Enum type
          category: formData.category,
          description: formData.description,
          date: formData.date
        }])

      if (error) throw error

      toast('Transaction recorded successfully.', 'success')

      setIsModalOpen(false)
      setFormData({
        amount: '',
        type: 'income',
        category: 'Subscription',
        description: '',
        date: new Date().toISOString().split('T')[0]
      })

      fetchTransactions()

    } catch (error: any) {
      console.error('Insert error:', error) // Good for debugging specific schema violations
      toast(error.message || 'Failed to record transaction', 'error')
    }
  }

  // ─── Calculations ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
    return { income, expenses, net: income - expenses }
  }, [transactions])

  const categoryShare = useMemo(() => {
    const totalExp = stats.expenses || 1
    return CATEGORIES.map(cat => {
      const val = transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((acc, t) => acc + t.amount, 0)
      return { name: cat, percent: Math.round((val / totalExp) * 100) }
    }).filter(c => c.percent > 0).sort((a, b) => b.percent - a.percent)
  }, [transactions, stats.expenses])

  const chartData = useMemo(() => {
    const buckets: { label: string; income: number; expense: number; matchKey: string | number }[] = []
    const now = new Date()

    if (view === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        buckets.push({ 
          label: d.toLocaleDateString('en-US', { weekday: 'short' }), 
          matchKey: d.toISOString().split('T')[0], 
          income: 0, expense: 0 
        })
      }
    } else if (view === 'weekly') {
      for (let i = 4; i >= 0; i--) {
        buckets.push({ label: i === 0 ? 'This Wk' : `-${i} Wks`, matchKey: i, income: 0, expense: 0 })
      }
    } else if (view === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        buckets.push({ 
          label: d.toLocaleDateString('en-US', { month: 'short' }), 
          matchKey: d.toISOString().substring(0, 7), 
          income: 0, expense: 0 
        })
      }
    }

    transactions.forEach(t => {
      const tDate = new Date(t.date)
      let targetBucket = null

      if (view === 'daily') {
        const dateStr = t.date.split('T')[0]
        targetBucket = buckets.find(b => b.matchKey === dateStr)
      } else if (view === 'weekly') {
        const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24))
        const weeksAgo = Math.floor(diffDays / 7)
        targetBucket = buckets.find(b => b.matchKey === weeksAgo)
      } else if (view === 'monthly') {
        const monthStr = t.date.substring(0, 7)
        targetBucket = buckets.find(b => b.matchKey === monthStr)
      }

      if (targetBucket) {
        if (t.type === 'income') targetBucket.income += t.amount
        else targetBucket.expense += t.amount
      }
    })

    const maxVal = Math.max(...buckets.map(b => Math.max(b.income, b.expense)), 1)

    return buckets.map(b => ({
      ...b,
      incomeHeight: Math.max((b.income / maxVal) * 100, 2),
      expenseHeight: Math.max((b.expense / maxVal) * 100, 2),
      hasData: b.income > 0 || b.expense > 0
    }))
  }, [transactions, view])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, opacity: loading ? 0.7 : 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 32, margin: 0 }}>Capital Flow</h1>
          <p style={{ color: 'var(--grey)', fontFamily: 'DM Mono', fontSize: 12, marginTop: 4 }}>
            Attract Acquisition // Financial Intelligence Unit
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, background: 'var(--bg3)', padding: 4, borderRadius: 8, border: '1px solid var(--border2)' }}>
          {(['daily', 'weekly', 'monthly'] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 11, fontFamily: 'DM Mono', textTransform: 'uppercase',
                background: view === v ? 'var(--teal)' : 'transparent',
                color: view === v ? 'var(--bg1)' : 'var(--grey)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-3" style={{ gap: 20 }}>
        <StatCard title="Total Revenue" amount={stats.income} type="income" />
        <StatCard title="Total Expenses" amount={stats.expenses} type="expense" />
        <StatCard title="Net Profit" amount={stats.net} type="net" />
      </div>

      {/* Chart + Sidebar */}
      <div className="chart-sidebar-grid">
        {/* Chart */}
        <div className="card" style={{ height: 400, display: 'flex', flexDirection: 'column', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="section-label">Cashflow Visualization ({view})</div>
            <BarChart3 size={16} style={{ color: 'var(--teal)' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingTop: 20 }}>
            {chartData.map((data, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', gap: 4 }}>
                  <div title={`Income: R${data.income.toLocaleString()}`} style={{ flex: 1, maxWidth: '30px', height: `${data.incomeHeight}%`, background: data.hasData ? 'var(--teal)' : 'var(--bg3)', borderRadius: '4px 4px 0 0', opacity: data.income > 0 ? 0.9 : 0.3, transition: 'height 0.4s ease' }} />
                  <div title={`Expense: R${data.expense.toLocaleString()}`} style={{ flex: 1, maxWidth: '30px', height: `${data.expenseHeight}%`, background: data.hasData ? '#FF4444' : 'var(--bg3)', borderRadius: '4px 4px 0 0', opacity: data.expense > 0 ? 0.7 : 0.3, transition: 'height 0.4s ease' }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase' }}>{data.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Plus size={16} /> Record Transaction
            </button>
          </div>

          <div className="card" style={{ padding: 20, flex: 1 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Expense Distribution</div>
            {categoryShare.length > 0 ? categoryShare.map(cat => (
              <div key={cat.name} style={{ padding: '12px 0', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--white)' }}>{cat.name}</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--grey)' }}>{cat.percent}%</span>
              </div>
            )) : (
              <div style={{ fontSize: 11, color: 'var(--grey2)', textAlign: 'center', marginTop: 20 }}>No expenses tracked</div>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-label" style={{ margin: 0 }}>Transaction Ledger</div>
          <Filter size={14} style={{ color: 'var(--grey)' }} />
        </div>
        <table className="mobile-card-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border2)' }}>
              <th style={tableHeaderStyle}>Date</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Category</th>
              <th style={tableHeaderStyle} className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? transactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border2)' }}>
                <td style={tableCellStyle}>{new Date(t.date).toLocaleDateString()}</td>
                <td style={{ ...tableCellStyle, color: 'var(--white)', fontWeight: 500 }}>{t.description}</td>
                <td style={tableCellStyle}><span style={categoryBadgeStyle}>{t.category}</span></td>
                <td style={{ ...tableCellStyle, color: t.type === 'income' ? 'var(--teal)' : '#FF4444', textAlign: 'right', fontFamily: 'DM Mono' }}>
                  {t.type === 'income' ? '+' : '-'} R {t.amount.toLocaleString()}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--grey2)', fontSize: 12 }}>
                  No financial data recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Playfair Display', margin: 0 }}>New Transaction</h2>
              <X size={20} onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer', color: 'var(--grey)' }} />
            </div>
            
            <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Amount (ZAR)</label>
                <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={inputStyle} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                    style={inputStyle}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={inputStyle}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>Description</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={inputStyle} />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={inputStyle} />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>Post to Ledger</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const tableHeaderStyle: React.CSSProperties = { padding: '12px 24px', fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase' }
const tableCellStyle: React.CSSProperties = { padding: '16px 24px', fontSize: 13, color: 'var(--grey)' }
const categoryBadgeStyle: React.CSSProperties = { background: 'var(--bg2)', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'DM Mono', color: 'var(--teal)', border: '1px solid var(--teal-border)' }
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }
const modalContentStyle: React.CSSProperties = { width: '100%', maxWidth: 450, padding: 32, background: 'var(--bg1)', border: '1px solid var(--border2)' }
const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase' }
const inputStyle: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'white', padding: '10px', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }
