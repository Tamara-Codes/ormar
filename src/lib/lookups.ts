import { supabase } from './supabase'

export interface DefaultLookupRecord {
  slug: string
  name: string
  sort_order: number | null
  is_active: boolean | null
}

const mapLookup = (data: DefaultLookupRecord[] | null | undefined) =>
  (data || []).map((row) => ({
    value: row.slug,
    label: row.name,
  }))

export async function getDefaultConditions(): Promise<Array<{ value: string; label: string }>> {
  const { data, error } = await supabase
    .from('default_conditions')
    .select('slug,name,sort_order,is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch conditions: ${error.message}`)
  }

  return mapLookup(data as DefaultLookupRecord[])
}

export async function getDefaultMaterials(): Promise<Array<{ value: string; label: string }>> {
  const { data, error } = await supabase
    .from('default_materials')
    .select('slug,name,sort_order,is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch materials: ${error.message}`)
  }

  return mapLookup(data as DefaultLookupRecord[])
}

