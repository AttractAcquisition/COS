import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AppFile } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { Plus, Copy, Save, FileText, FileCode, X, Upload } from 'lucide-react'
import { useToast } from '../lib/toast'
import { useAuth } from '../lib/auth'
import { TEMPLATE_CATEGORY_ORDER, getDefaultTemplateCategory, getVisibleTemplateCategories, roleToLibraryScope } from '../lib/library'
import { openSavedFile, isHtmlDocument } from '../lib/file-viewer'

// Updated interface to match Supabase's nullable return types
interface Template { 
  id: string; 
  created_at: string | null; 
  updated_at: string | null; 
  title: string; 
  category: string | null; 
  content: string | null; 
  variables: string[] | null; 
  char_count: number | null 
}

const CATEGORIES = [
  { key: 'all', label: 'All Templates' },
  { key: 'outreach',     label: 'Outreach & Pipeline' },
  { key: 'mjr', label: 'Missed Jobs Report' },
  { key: 'spoa', label: 'Strategic Plan of Action' },
  { key: 'sprint', label: 'Proof Sprint' },
  { key: 'brand', label: 'Proof Brand' },
  { key: 'authority', label: 'Authority Brand' },
  { key: 'delivery', label: 'Delivery Ops' },
  { key: 'content', label: 'Content Production' },
  { key: 'support', label: 'Support & Escalations' },
  { key: 'finance', label: 'Finance' },
  { key: 'general', label: 'General' },
  { key: 'admin', label: 'Admin' },
]

const categoryOrder = [...TEMPLATE_CATEGORY_ORDER]

function sortTemplates(rows: Template[]) {
  return [...rows].sort((a, b) => {
    const ai = a.category ? categoryOrder.indexOf(a.category as any) : -1
    const bi = b.category ? categoryOrder.indexOf(b.category as any) : -1
    const aIndex = ai === -1 ? categoryOrder.length : ai
    const bIndex = bi === -1 ? categoryOrder.length : bi
    if (aIndex !== bIndex) return aIndex - bIndex
    return (a.title || '').localeCompare(b.title || '')
  })
}

export default function Templates() {
  const { user, role } = useAuth()
  const scope = roleToLibraryScope(role)
  const [templates, setTemplates]   = useState<Template[]>([])
  const [catFilter, setCatFilter]   = useState('all')
  const [selected, setSelected]     = useState<Template | null>(null)
  const [editForm, setEditForm]     = useState({ title: '', category: 'outreach', content: '' })
  const [isNew, setIsNew]           = useState(false)
  const [saving, setSaving]         = useState(false)
  const { toast }                   = useToast()

  const [associatedFiles, setAssociatedFiles] = useState<AppFile[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const defaultCategory = getDefaultTemplateCategory(scope)
    setCatFilter(prev => prev === 'all' || getVisibleTemplateCategories(scope).includes(prev) ? prev : defaultCategory)
  }, [scope])

  useEffect(() => { load() }, [catFilter, scope])

  async function load() {
    const allowedCategories = getVisibleTemplateCategories(scope)
    if (!allowedCategories.length) {
      setTemplates([])
      return
    }

    const query = supabase
      .from('templates')
      .select('*')
      .in('category', allowedCategories)
      .order('updated_at', { ascending: false })

    const { data } = await query
    
    setTemplates((data as Template[]) || [])
    setSelected(null)
    setIsNew(false)
  }

async function loadFiles(templateId: string) {
    const { data, error } = await supabase
      .from('app_files')
      .select('*')
      .eq('associated_sop_id', templateId) // Pointing to your actual table column

    if (!error && data) {
      setAssociatedFiles(data)
    }
  }

  function selectTemplate(t: Template) {
    setSelected(t)
    setEditForm({ 
      title: t.title || '', 
      category: t.category || 'outreach', 
      content: t.content || '' 
    })
    setIsNew(false)
    loadFiles(t.id)
  }

  function newTemplate() {
    setSelected(null)
    setEditForm({ title: '', category: catFilter === 'all' ? getDefaultTemplateCategory(scope) : (catFilter || getDefaultTemplateCategory(scope)), content: '' })
    setIsNew(true)
    setAssociatedFiles([])
  }

async function save() {
    if (!editForm.title || !editForm.content) { 
      toast('Title and content required', 'error')
      return 
    }
    setSaving(true)
    
    // Calculate variables to match your _text column in Supabase
    const extractedVars = [...new Set(editForm.content?.match(/\{[^}]+\}/g) || [])]

    const payload = { 
      title: editForm.title,
      category: editForm.category,
      content: editForm.content,
      char_count: editForm.content.length,
      variables: extractedVars, // Fixed: Added variables array
      last_edited_by: user?.id || 'anonymous', // Fixed: Added editor ID
      updated_at: new Date().toISOString() 
    }

    if (isNew) {
      // Use array syntax for insert to be more robust
      const { data, error } = await supabase.from('templates').insert([payload]).select().single()
      if (error) { 
        console.error('Supabase Save Error:', error)
        toast(`Failed to save: ${error.message}`, 'error')
        setSaving(false)
        return 
      }
      setTemplates(prev => [data as Template, ...prev])
      setSelected(data as Template)
      setIsNew(false)
    } else if (selected) {
      const { data, error } = await supabase.from('templates').update(payload).eq('id', selected.id).select().single()
      if (error) { 
        console.error('Supabase Update Error:', error)
        toast(`Failed to update: ${error.message}`, 'error')
        setSaving(false)
        return 
      }
      setTemplates(prev => prev.map(t => t.id === data.id ? (data as Template) : t))
      setSelected(data as Template)
    }
    setSaving(false)
    toast('Template saved ✓')
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
  if (!selected || isNew || !event.target.files || event.target.files.length === 0) return

  setUploading(true)
  const file = event.target.files[0]
  
  // Determine file extension and set proper MIME type for rendering
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'octect-stream'
  const isHtml = fileExtension === 'html' || file.type === 'text/html'
  const contentType = isHtml ? 'text/html' : (file.type || `application/${fileExtension}`)

  const safeName = file.name
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9. -]/gi, "_")
    .replace(/\s+/g, "_");
  
  const fileName = `${Date.now()}-${safeName}`
  const filePath = `template_files/${selected.id}/${fileName}`

try {
    // 1. Upload to Storage with explicit contentType AND inline disposition
    const { error: storageError } = await supabase.storage
      .from('template-files')
      .upload(filePath, file, { 
        cacheControl: '0', 
        upsert: true,
        contentType: contentType, // Ensure this variable (text/html) is used
        // Use spread with 'as any' to bypass strict FileOptions type check
        ...({ contentDisposition: 'inline' } as any) 
      })

    if (storageError) throw storageError

    // 2. Get the Public URL
    const { data: publicUrlData } = supabase.storage
      .from('template-files')
      .getPublicUrl(filePath)

    // 3. Insert into Database
    const { data: fileDbData, error: fileDbError } = await supabase
      .from('app_files')
      .insert({
        file_name: file.name,
        file_path: publicUrlData.publicUrl,
        file_type: contentType, // Store the calculated content type
        associated_sop_id: selected.id,
        uploaded_by: user?.id,
      })
      .select()
      .single()

    if (fileDbError) throw fileDbError
    
    setAssociatedFiles(prev => [...prev, fileDbData])
    toast('File uploaded successfully! ✓')
  } catch (error: any) {
    console.error('Upload Error:', error)
    toast(`Upload failed: ${error.message}`, 'error')
  } finally {
    setUploading(false)
    event.target.value = ''
  }
}
  
  async function handleFileDelete(fileToDelete: AppFile) {
    if (!confirm(`Are you sure you want to delete "${fileToDelete.file_name}"?`)) return

    try {
      const pathSegments = fileToDelete.file_path.split('/template-files/') 
      if (pathSegments.length < 2) throw new Error('Invalid file path.')
      const pathInBucket = pathSegments[1]

      await supabase.storage.from('template-files').remove([pathInBucket])
      await supabase.from('app_files').delete().eq('id', fileToDelete.id)

      setAssociatedFiles(prev => prev.filter(f => f.id !== fileToDelete.id))
      toast('File deleted successfully!')
    } catch (error: any) {
      toast(`Deletion failed: ${error.message}`, 'error')
    }
  }

  function copyToClipboard() {
    if (!editForm.content) return
    navigator.clipboard.writeText(editForm.content)
    toast('Copied to clipboard')
  }

  const charCount = editForm.content?.length || 0
  const charColor = charCount > 1024 ? 'var(--red)' : charCount > 900 ? 'var(--amber)' : 'var(--grey)'
  const vars = [...new Set(editForm.content?.match(/\{[^}]+\}/g) || [])]
  const allowedCategories = getVisibleTemplateCategories(scope)
  const visibleTemplates = catFilter === 'all'
    ? sortTemplates(templates)
    : sortTemplates(templates.filter(t => t.category === catFilter))
  const visibleCategoryOptions = CATEGORIES.filter(c => c.key === 'all' || allowedCategories.includes(c.key))

  return (
    <div className="sprint-panel" style={{ gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visibleCategoryOptions.map(c => (
            <button key={c.key} onClick={() => setCatFilter(c.key)}
              style={{ background: catFilter === c.key ? 'var(--teal-faint)' : 'transparent', border: `1px solid ${catFilter === c.key ? 'var(--teal-border)' : 'transparent'}`, borderRadius: 4, padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'Barlow', fontSize: 13, color: catFilter === c.key ? 'var(--teal)' : 'var(--grey)', transition: 'all 0.15s' }}>
              {c.label}
              <span style={{ float: 'right', fontFamily: 'DM Mono', fontSize: 11, color: 'var(--grey2)' }}>
                {c.key === 'all' ? templates.length : (templates.filter(t => t.category === c.key).length || '')}
              </span>
            </button>
          ))}
        </div>

        <button className="btn-secondary" onClick={newTemplate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Plus size={12} /> New Template
        </button>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleTemplates.map(t => (
            <div key={t.id} onClick={() => selectTemplate(t)}
              style={{ padding: '10px 12px', borderRadius: 4, cursor: 'pointer', border: `1px solid ${selected?.id === t.id ? 'var(--teal)' : 'var(--border2)'}`, background: selected?.id === t.id ? 'var(--teal-faint)' : 'var(--bg2)', transition: 'all 0.15s' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)' }}>{t.char_count || 0} chars</span>
                <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)' }}>{formatDate(t.updated_at || t.created_at || '')}</span>
              </div>
            </div>
          ))}
          {visibleTemplates.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--grey)', fontSize: 12, fontFamily: 'DM Mono' }}>No templates in this category</div>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(selected || isNew) ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: 16 }}>
                <div className="label">Template Title</div>
                <input className="input" placeholder="e.g. Cold Intro — WhatsApp" value={editForm.title} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div style={{ width: 160 }}>
                <div className="label">Category</div>
                <select className="input" value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}>
                {CATEGORIES.filter(c => c.key !== 'all' && allowedCategories.includes(c.key)).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            </div>

{/* ASSOCIATED FILES BAR */}
{associatedFiles.length > 0 && (
  <div style={{ paddingBottom: 15, borderBottom: '1px solid var(--border2)', marginBottom: 20 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {associatedFiles.map(file => {
        const isHtml = isHtmlDocument(file.file_name, file.file_type);

        return (
          <div key={file.id} onClick={() => openSavedFile(file.file_path, file.file_name, file.file_type)} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg2)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border2)', minWidth: '200px', maxWidth: '300px', cursor: 'pointer' }}>
            {file.file_type === 'application/pdf' ? (
              <FileText size={14} style={{ color: 'var(--red)', marginRight: 10, flexShrink: 0 }} />
            ) : (
              <FileCode size={14} style={{ color: 'var(--teal)', marginRight: 10, flexShrink: 0 }} />
            )}
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span 
                style={{ fontSize: 11, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} 
                title={file.file_name}
              >
                {file.file_name}
              </span>
              
              <div style={{ display: 'flex', gap: 8, marginTop: 1 }}>
                <span style={{ color: isHtml ? 'var(--teal)' : 'var(--grey)', fontSize: 10, fontFamily: 'DM Mono', textDecoration: 'underline' }}>
                  {isHtml ? 'Open in Viewer' : 'Open File'}
                </span>
              </div>
            </div>

            <button 
              onClick={() => handleFileDelete(file)} 
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4, marginLeft: 4, display: 'flex', alignItems: 'center', opacity: 0.7 }}
              title="Delete File"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  </div>
)}

            {/* UPLOAD BUTTONS */}
            {!isNew && selected && (
              <div style={{ display: 'flex', gap: 8, padding: '10px', background: 'var(--bg3)', borderRadius: 6, border: '1px solid var(--border2)', alignItems: 'center' }}>
                <label className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 12px', fontSize: 11 }}>
                  <Upload size={11} /> {uploading ? 'Uploading...' : 'Upload File'}
                  <input type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} accept="application/pdf, text/html" />
                </label>
                <span style={{ fontSize: 11, color: 'var(--grey)' }}>Attach PDF or HTML resources to this template</span>
              </div>
            )}

            {vars.length > 0 && (
              <div>
                <div className="label">Variable Tags</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {vars.map(v => <span key={v} className="pill">{v}</span>)}
                </div>
              </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div className="label" style={{ margin: 0 }}>Content</div>
                <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: charColor }}>{charCount} / 1024 chars {charCount > 1024 ? '⚠ over WhatsApp limit' : ''}</span>
              </div>
              <textarea className="input" rows={12}
                placeholder="Write your template here. Use {business_name}, {owner_name}, {vertical}, {suburb} as variable placeholders."
                value={editForm.content}
                onChange={e => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                style={{ flex: 1, fontFamily: 'DM Mono', fontSize: 13, lineHeight: 1.7, resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={save} disabled={saving} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Save size={12} /> {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button className="btn-secondary" onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Copy size={12} /> Copy
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>Select a template</h3>
            <p>Choose a template from the list to edit it, or create a new one.</p>
            <button className="btn-primary" onClick={newTemplate}>New Template</button>
          </div>
        )}
      </div>
    </div>
  )
}
