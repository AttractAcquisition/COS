import { supabase } from './supabase'

export interface BrainSource {
  document_id: string
  document_title: string
  source_path: string | null
  file_path: string | null
  chunk_index: number
  score: number
}

export interface BrainResponse {
  answer: string
  sources: BrainSource[]
  model_name?: string
  query_id?: string
}

export async function queryBrain(query: string, conversationId?: string) {
  const { data, error } = await supabase.functions.invoke('claude-chat', {
    body: { query, conversation_id: conversationId ?? null },
  })

  if (error) throw error
  return data as BrainResponse
}
