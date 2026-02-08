import { supabase } from './supabase'

export interface PostGroup {
  id: string
  user_id: string
  name: string
  rules: string
  created_at: string
  updated_at: string
}

// Get all post groups for the current user
export async function getPostGroups(): Promise<PostGroup[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('post_groups')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch post groups: ${error.message}`)
  }

  return data || []
}

// Get a single post group by ID
export async function getPostGroup(groupId: string): Promise<PostGroup | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('post_groups')
    .select('*')
    .eq('id', groupId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch post group: ${error.message}`)
  }

  return data
}

// Create a new post group
export async function createPostGroup(name: string, rules: string): Promise<PostGroup> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmedName = name.trim()
  const trimmedRules = rules.trim()

  if (!trimmedName) {
    throw new Error('Unesite ime grupe')
  }

  if (!trimmedRules) {
    throw new Error('Unesite pravila za grupu')
  }

  // Check if group with this name already exists
  const { data: existing } = await supabase
    .from('post_groups')
    .select('*')
    .eq('user_id', user.id)
    .eq('name', trimmedName)
    .single()

  if (existing) {
    throw new Error('Grupa s tim imenom već postoji')
  }

  const { data, error } = await supabase
    .from('post_groups')
    .insert({
      user_id: user.id,
      name: trimmedName,
      rules: trimmedRules,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create post group: ${error.message}`)
  return data
}

// Update a post group
export async function updatePostGroup(groupId: string, name: string, rules: string): Promise<PostGroup> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmedName = name.trim()
  const trimmedRules = rules.trim()

  if (!trimmedName) {
    throw new Error('Unesite ime grupe')
  }

  if (!trimmedRules) {
    throw new Error('Unesite pravila za grupu')
  }

  // Check if another group with this name already exists
  const { data: existing } = await supabase
    .from('post_groups')
    .select('*')
    .eq('user_id', user.id)
    .eq('name', trimmedName)
    .neq('id', groupId)
    .single()

  if (existing) {
    throw new Error('Grupa s tim imenom već postoji')
  }

  const { data, error } = await supabase
    .from('post_groups')
    .update({
      name: trimmedName,
      rules: trimmedRules,
    })
    .eq('id', groupId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update post group: ${error.message}`)
  return data
}

// Delete a post group
export async function deletePostGroup(groupId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('post_groups')
    .delete()
    .eq('id', groupId)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to delete post group: ${error.message}`)
}

