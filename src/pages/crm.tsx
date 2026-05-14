import { useEffect, useState } from 'react'
import { supabase, type Prospect } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { 
  RefreshCcw, User, Archive, ArrowUpCircle, 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle 
} from 'lucide-react'
import ProspectDetailView from '../components/prospects/ProspectDetailView'
import { format, subDays, addDays, isBefore, startOfDay } from 'date-fns'

const STAGES = ['First Touch', 'Positive Response', 'MJR Sent', 'Follow Up', 'Call Booked', 'Sprint Booked']

export default function CRM() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'board' | 'archive' | 'followups'>('board')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selected, setSelected] = useState<Prospect | null>(null)
  const { toast } = useToast()

  useEffect(() => { load() }, [view, selectedDate])

  async function load() {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    
    let query = supabase
      .from('prospects')
      .select('*')
      .eq('is_archived', view === 'archive')

    if (view === 'board') {
      // Show the pipeline for the specific batch date selected
      query = query.eq('target_date', dateStr)
    } else if (view === 'followups') {
      // Surface anyone from PAST dates who hasn't reached 'Call Booked'
      query = query
        .lt('target_date', todayStr)
        .not('pipeline_stage', 'in', '("Call Booked","Sprint Booked")')
    }

    const { data } = await query.order('updated_at', { ascending: false })
    
    setProspects((data || []).map(p => ({ 
      ...p, 
      pipeline_stage: (p as any).pipeline_stage || 'First Touch' 
    })))
    setLoading(false)
  }

  async function updateStage(id: string, newStage: string) {
    // TODO Phase 3: route through an update-prospect-pipeline AICOS Edge Function
    const { error } = await supabase.from('prospects').update({
      pipeline_stage: newStage,
      updated_at: new Date().toISOString()
    } as any).eq('id', id)
    
    if (!error) {
      setProspects(prev => prev.map(p => p.id === id ? { ...p, pipeline_stage: newStage } : p))
      toast(`Moved to ${newStage}`)
    }
  }

  async function toggleArchive(id: string, currentStatus: boolean) {
    // TODO Phase 3: route through an archive-prospect AICOS Edge Function
    const { error } = await supabase
      .from('prospects')
      .update({ is_archived: !currentStatus, updated_at: new Date().toISOString() } as any)
      .eq('id', id)

    if (!error) {
      setProspects(prev => prev.filter(p => p.id !== id))
      toast(!currentStatus ? 'Prospect Archived' : 'Prospect Restored')
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 bg-bg2 p-1 rounded-lg border border-border2">
          <button onClick={() => setView('board')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'board' ? 'bg-teal text-bg1' : 'text-grey hover:text-white'}`}>Daily Batch</button>
          <button onClick={() => setView('followups')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${view === 'followups' ? 'bg-orange-500 text-white' : 'text-grey hover:text-white'}`}>
            Follow Ups {view !== 'followups' && prospects.some(p => isBefore(new Date(p.target_date || ''), startOfDay(new Date()))) && <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
          </button>
          <button onClick={() => setView('archive')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'archive' ? 'bg-bg3 text-white' : 'text-grey hover:text-white'}`}>Archive</button>
        </div>

        {view === 'board' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-bg2 border border-border2 rounded-lg p-1">
              <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-1 hover:text-teal"><ChevronLeft size={18} /></button>
              <div className="px-3 font-mono text-[11px] flex items-center gap-2">
                <CalendarIcon size={12} className="text-teal" />
                {format(selectedDate, 'MMM do, yyyy')}
              </div>
              <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-1 hover:text-teal"><ChevronRight size={18} /></button>
            </div>
            <button onClick={load} className="p-2 hover:bg-bg2 rounded-lg transition-colors">
              <RefreshCcw size={16} className={loading ? 'animate-spin text-teal' : 'text-grey'} />
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 flex-1 custom-scrollbar">
        {STAGES.map(stage => {
          const stageProspects = prospects.filter(p => (p as any).pipeline_stage === stage);
          
          return (
            <div key={stage} className="flex flex-col min-w-[300px] max-w-[300px] bg-bg2/50 rounded-xl border border-border2/50">
              {/* Column Header */}
              <div className="p-4 flex justify-between items-center border-b border-border2/50 bg-bg2/80 rounded-t-xl">
                <span className="text-[10px] font-mono uppercase tracking-widest text-grey font-bold">{stage}</span>
                <span className="bg-bg3 text-teal text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {stageProspects.length}
                </span>
              </div>
              
              {/* Cards Container */}
              <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1">
                {stageProspects.map(p => {
                  const isOverdue = isBefore(new Date(p.target_date || ''), startOfDay(new Date())) && (p as any).pipeline_stage !== 'Call Booked';

                  return (
                    <div 
                      key={p.id} 
                      onClick={() => setSelected(p)} 
                      className={`group relative p-4 bg-bg3 border rounded-lg cursor-pointer transition-all hover:border-teal/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${isOverdue && view !== 'archive' ? 'border-orange-500/30' : 'border-border2'}`}
                    >
                      {isOverdue && view !== 'archive' && (
                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white p-1 rounded-full shadow-lg">
                          <AlertCircle size={12} />
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-sm text-white group-hover:text-teal transition-colors truncate pr-4">{p.business_name}</h4>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleArchive(p.id, !!p.is_archived); }}
                          className="text-grey hover:text-white transition-colors"
                        >
                          {p.is_archived ? <ArrowUpCircle size={14} /> : <Archive size={14} />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-grey font-mono mb-4">
                        <User size={10} />
                        <span className="truncate">{p.owner_name || 'Unknown Owner'}</span>
                        <span className="text-border2">•</span>
                        <span>{p.suburb || 'ZA'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-border2/50">
                        <div className="text-[9px] font-mono text-grey2 uppercase">
                          Batch: {p.target_date ? format(new Date(p.target_date), 'MM/dd') : 'N/A'}
                        </div>
                        <select 
                          onClick={e => e.stopPropagation()}
                          className="bg-transparent text-teal text-[10px] font-mono cursor-pointer outline-none"
                          value={(p as any).pipeline_stage}
                          onChange={(e) => updateStage(p.id, e.target.value)}
                        >
                          {STAGES.map(s => <option key={s} value={s} className="bg-bg1 text-white">{s}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <ProspectDetailView 
          prospect={selected} 
          onClose={() => setSelected(null)} 
          onUpdate={(updates) => {
            setProspects(prev => prev.map(p => p.id === selected.id ? { ...p, ...updates } : p))
            setSelected(prev => prev ? { ...prev, ...updates } : null)
          }}
          onDelete={(id) => {
            setProspects(prev => prev.filter(p => p.id !== id))
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}
