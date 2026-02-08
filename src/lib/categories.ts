import { supabase } from './supabase'
export interface DefaultCategoryRecord {
  slug: string
  name: string
  sort_order: number | null
  is_active: boolean | null
}

export interface CustomCategory {
  id: string
  user_id: string
  name: string
  slug: string
  created_at: string
}

export async function getDefaultCategories(): Promise<Array<{ value: string; label: string }>> {
  const { data, error } = await supabase
    .from('default_categories')
    .select('slug,name,sort_order,is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch default categories: ${error.message}`)
  }

  return (data || []).map((cat: DefaultCategoryRecord) => ({
    value: cat.slug,
    label: cat.name,
  }))
}

// Get custom categories only
export async function getCustomCategories(): Promise<CustomCategory[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }

  return data || []
}

// Get all categories (default + custom)
export async function getAllCategories(): Promise<Array<{ value: string; label: string; isCustom: boolean }>> {
  const { data: { user } } = await supabase.auth.getUser()

  const defaultCategories = await getDefaultCategories()

  if (!user) {
    // Return only default categories if not authenticated
    return [
      { value: 'all', label: 'Sve kategorije', isCustom: false },
      ...defaultCategories.map((cat) => ({
        value: cat.value,
        label: cat.label,
        isCustom: false,
      })),
    ]
  }

  // Get custom categories from database
  const { data: customCategories, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching custom categories:', error)
    // Return only default categories on error
    return [
      { value: 'all', label: 'Sve kategorije', isCustom: false },
      ...defaultCategories.map((cat) => ({
        value: cat.value,
        label: cat.label,
        isCustom: false,
      })),
    ]
  }

  // Combine default and custom categories
  const defaultWithAll = [
    { value: 'all', label: 'Sve kategorije', isCustom: false },
    ...defaultCategories.map((cat) => ({
      value: cat.value,
      label: cat.label,
      isCustom: false,
    })),
  ]

  const custom = (customCategories || []).map((cat) => ({
    value: cat.slug,
    label: cat.name,
    isCustom: true,
  }))

  return [...defaultWithAll, ...custom]
}

// Create a new custom category
export async function createCustomCategory(name: string): Promise<CustomCategory> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  // Check if category with this slug already exists
  const { data: existing } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .single()

  if (existing) {
    throw new Error('Kategorija s tim imenom već postoji')
  }

  const { data, error } = await supabase
    .from('custom_categories')
    .insert({
      user_id: user.id,
      name: name.trim(),
      slug,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create category: ${error.message}`)
  return data
}

// Delete a custom category
export async function deleteCustomCategory(categoryId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('custom_categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to delete category: ${error.message}`)
}

// Update a custom category name
export async function updateCustomCategory(categoryId: string, name: string): Promise<CustomCategory> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Unesite ime kategorije')

  const { data, error } = await supabase
    .from('custom_categories')
    .update({ name: trimmedName })
    .eq('id', categoryId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update category: ${error.message}`)
  return data
}

