import { supabase } from './supabase'
import type { AIAnalysis, Item, ItemFormData, Post, ItemStatus, Publication } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============================================
// DIRECT SUPABASE CALLS (fast, no backend hop)
// ============================================

export async function getItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch items: ${error.message}`)
  return data || []
}

export async function getItem(itemId: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (error) throw new Error(`Item not found: ${error.message}`)
  return data
}

export async function createItem(formData: ItemFormData): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Upload images to Supabase Storage
  const imageUrls: string[] = []
  for (let i = 0; i < formData.images.length; i++) {
    const file = formData.images[i]
    const timestamp = Date.now()
    const filePath = `${user.id}/${timestamp}_${i}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(filePath, file)

    if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('item-images')
      .getPublicUrl(filePath)

    imageUrls.push(publicUrl)
  }

  // Insert item
  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: user.id,
      title: formData.title,
      description: formData.description || '',
      category: formData.category,
      brand: formData.brand || null,
      size: formData.size || null,
      condition: formData.condition,
      material: formData.material || null,
      color: formData.color || null,
      price: formData.price,
      images: imageUrls,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create item: ${error.message}`)
  return data
}

export async function updateItem(itemId: string, updates: Partial<ItemFormData>): Promise<Item> {
  const updateData: Record<string, unknown> = {}

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.brand !== undefined) updateData.brand = updates.brand
  if (updates.size !== undefined) updateData.size = updates.size
  if (updates.condition !== undefined) updateData.condition = updates.condition
  if (updates.material !== undefined) updateData.material = updates.material
  if (updates.color !== undefined) updateData.color = updates.color
  if (updates.price !== undefined) updateData.price = updates.price

  const { data, error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update item: ${error.message}`)
  return data
}

export async function deleteItem(itemId: string): Promise<void> {
  // Get item first to delete images
  const item = await getItem(itemId)

  // Delete images from storage
  for (const imageUrl of item.images || []) {
    try {
      const path = imageUrl.split('/item-images/')[1]?.split('?')[0]
      if (path) {
        await supabase.storage.from('item-images').remove([path])
      }
    } catch (e) {
      console.warn('Failed to delete image:', e)
    }
  }

  // Delete item
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(`Failed to delete item: ${error.message}`)
}

export async function updateItemsStatus(itemIds: string[], status: ItemStatus): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ status })
    .in('id', itemIds)

  if (error) throw new Error(`Failed to update status: ${error.message}`)
}

export async function updateItemImage(
  itemId: string,
  imageIndex: number,
  newImageBlob: Blob
): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current item
  const item = await getItem(itemId)
  const currentImages = [...(item.images || [])]

  // Upload new image
  const timestamp = Date.now()
  const filePath = `${user.id}/${itemId}/${timestamp}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(filePath, newImageBlob)

  if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('item-images')
    .getPublicUrl(filePath)

  // Update images array
  currentImages[imageIndex] = publicUrl

  // Update item
  const { data, error } = await supabase
    .from('items')
    .update({ images: currentImages })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update item: ${error.message}`)
  return data
}

export async function deleteItemImage(itemId: string, imageIndex: number): Promise<Item> {
  const item = await getItem(itemId)
  const currentImages = [...(item.images || [])]

  // Delete from storage
  const imageUrl = currentImages[imageIndex]
  try {
    const path = imageUrl.split('/item-images/')[1]?.split('?')[0]
    if (path) {
      await supabase.storage.from('item-images').remove([path])
    }
  } catch (e) {
    console.warn('Failed to delete image from storage:', e)
  }

  // Remove from array
  currentImages.splice(imageIndex, 1)

  // Update item
  const { data, error } = await supabase
    .from('items')
    .update({ images: currentImages })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update item: ${error.message}`)
  return data
}

export async function addItemImages(itemId: string, images: File[]): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const item = await getItem(itemId)
  const currentImages = [...(item.images || [])]

  // Upload new images
  for (let i = 0; i < images.length; i++) {
    const file = images[i]
    const timestamp = Date.now()
    const filePath = `${user.id}/${itemId}/${timestamp}_${i}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(filePath, file)

    if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('item-images')
      .getPublicUrl(filePath)

    currentImages.push(publicUrl)
  }

  // Update item
  const { data, error } = await supabase
    .from('items')
    .update({ images: currentImages })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update item: ${error.message}`)
  return data
}

// Posts and Publications (direct Supabase)
export async function getSavedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch posts: ${error.message}`)
  return data || []
}

export async function savePost(
  itemIds: string[],
  description?: string,
  collageUrl?: string
): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      item_ids: itemIds,
      description: description || null,
      collage_url: collageUrl || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save post: ${error.message}`)
  return data
}

export async function updatePost(
  postId: string,
  updates: { itemIds?: string[]; description?: string | null; collageUrl?: string | null }
): Promise<Post> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.itemIds !== undefined) updateData.item_ids = updates.itemIds
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.collageUrl !== undefined) updateData.collage_url = updates.collageUrl

  const { data, error } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update post: ${error.message}`)
  return data
}

export async function getPublications(): Promise<Publication[]> {
  const { data, error } = await supabase
    .from('publications')
    .select('*')
    .order('published_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch publications: ${error.message}`)
  return data || []
}

export async function createPublication(
  itemIds: string[],
  fbPageName: string,
  postId?: string,
  description?: string,
  collageUrl?: string
): Promise<Publication> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('publications')
    .insert({
      user_id: user.id,
      post_id: postId || null,
      item_ids: itemIds,
      fb_page_name: fbPageName,
      description: description || null,
      collage_url: collageUrl || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create publication: ${error.message}`)
  return data
}

export async function uploadCollage(collageBlob: Blob): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const timestamp = Date.now()
  // Keep auth.uid() as the first folder segment to satisfy storage RLS policy.
  const filePath = `${user.id}/collages/${timestamp}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(filePath, collageBlob)

  if (uploadError) throw new Error(`Failed to upload collage: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('item-images')
    .getPublicUrl(filePath)

  return publicUrl
}

// ============================================
// BACKEND CALLS (for AI - need secret API keys)
// ============================================

export async function analyzeImage(
  imageFile: File,
  categories?: Array<{ value: string; label: string }>,
): Promise<AIAnalysis> {
  const formData = new FormData()
  formData.append('image', imageFile)
  if (categories && categories.length > 0) {
    formData.append('categories', JSON.stringify(categories))
  }

  const url = `${API_BASE}/api/analyze-image`
  console.log('[ANALYZE-IMAGE] Sending request to:', url)
  console.log('[ANALYZE-IMAGE] API_BASE:', API_BASE)
  console.log('[ANALYZE-IMAGE] File:', imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(2)}KB`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it automatically with boundary
    })

    console.log('[ANALYZE-IMAGE] Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ANALYZE-IMAGE] Error response:', response.status, errorText)
      throw new Error(`AI analysis failed (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log('[ANALYZE-IMAGE] Success:', data)
    return data
  } catch (error) {
    console.error('[ANALYZE-IMAGE] Full error:', error)
    if (error instanceof TypeError) {
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to backend at ${API_BASE}. Make sure the backend is running on port 8000.`)
      }
    }
    throw error
  }
}

export async function removeBackground(imageUrl: string): Promise<Blob> {
  const imageResponse = await fetch(imageUrl)
  const imageBlob = await imageResponse.blob()
  const imageFile = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' })

  const formData = new FormData()
  formData.append('image', imageFile)

  const response = await fetch(`${API_BASE}/api/remove-background`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Background removal failed')
  }

  return response.blob()
}

export async function generatePostDescription(items: Item[], groupRules?: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/generate-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map(item => ({
        title: item.title,
        brand: item.brand,
        size: item.size,
        condition: item.condition,
        price: item.price,
        category: item.category,
      })),
      group_rules: groupRules || null,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to generate description')
  }

  const data = await response.json()
  return data.description
}

export async function createCollage(imageUrls: string[], columns: number = 2): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/create-collage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_urls: imageUrls, columns }),
  })

  if (!response.ok) {
    throw new Error('Failed to create collage')
  }

  return response.blob()
}
