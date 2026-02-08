import { supabase } from './supabase'

export interface Sale {
  id: string
  user_id: string
  title: string
  category: string
  brand: string | null
  size: string | null
  price: number
  condition: string
  sold_at: string
  created_at: string
}

// Get all sales for the current user
export async function getSales(): Promise<Sale[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('user_id', user.id)
    .order('sold_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch sales: ${error.message}`)
  }

  return data || []
}

// Create a sale record (called when marking item as sold)
export async function createSale(
  title: string,
  category: string,
  price: number,
  condition: string,
  brand?: string | null,
  size?: string | null
): Promise<Sale> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
      title,
      category,
      brand: brand || null,
      size: size || null,
      price,
      condition,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create sale: ${error.message}`)
  }

  return data
}

// Delete an image from Supabase storage
async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the full URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/item-images/[userId]/[filename]
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/item-images/')
    if (pathParts.length < 2) return
    
    const filePath = pathParts[1]
    
    const { error } = await supabase.storage
      .from('item-images')
      .remove([filePath])

    if (error) {
      console.error('Failed to delete image:', error.message)
    }
  } catch (err) {
    console.error('Error deleting image:', err)
  }
}

// Mark item as sold: create sale record, delete images, delete item
export async function markItemAsSold(item: {
  id: string
  title: string
  category: string
  price: number
  condition: string
  brand?: string | null
  size?: string | null
  images: string[]
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  try {
    // 1. Create sale record
    await createSale(item.title, item.category, item.price, item.condition, item.brand, item.size)

    // 2. Delete all images from storage
    await Promise.all(item.images.map(imageUrl => deleteImageFromStorage(imageUrl)))

    // 3. Delete item from database
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(`Failed to delete item: ${error.message}`)
    }
  } catch (err) {
    throw new Error(`Failed to mark item as sold: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

