import { supabase } from './supabase'
import type { AIAnalysis, Item, ItemFormData, Post, ItemStatus, Publication } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getAuthToken(): Promise<string> {
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  if (!token) {
    // Development mode: return a test token
    if (import.meta.env.DEV) {
      console.warn('[AUTH] Development mode: no session found, using test token')
      return 'test-token-dev'
    }
    console.error('[AUTH] No session found. User may not be logged in.')
    throw new Error('Not authenticated - please log in first')
  }

  console.log('[AUTH] Token retrieved successfully')
  return token
}

export async function analyzeImage(imageFile: File): Promise<AIAnalysis> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const response = await fetch(`${API_BASE}/api/analyze-image`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('AI analysis failed')
  }

  const data = await response.json()

  // Backend already returns English field names
  return {
    title: data.title,
    category: data.category,
    brand: data.brand,
    size: data.size,
    estimatedPrice: data.estimatedPrice,
  }
}

export async function createItem(data: ItemFormData): Promise<Item> {
  console.log('[CREATE_ITEM] Starting...')
  const token = await getAuthToken()
  console.log('[CREATE_ITEM] Token obtained')

  const formData = new FormData()

  // Add form fields
  formData.append('title', data.title)
  formData.append('description', data.description)
  formData.append('category', data.category)
  if (data.brand) formData.append('brand', data.brand)
  if (data.size) formData.append('size', data.size)
  if (data.condition) formData.append('condition', data.condition)
  if (data.material) formData.append('material', data.material)
  if (data.color) formData.append('color', data.color)
  formData.append('price', data.price.toString())

  // Add image files
  data.images.forEach((file) => {
    formData.append('images', file)
  })
  console.log('[CREATE_ITEM] Form data prepared with', data.images.length, 'images')

  const response = await fetch(`${API_BASE}/api/items`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  console.log('[CREATE_ITEM] Response status:', response.status)

  if (!response.ok) {
    const error = await response.text()
    console.error('[CREATE_ITEM] Error:', error)
    throw new Error(`Failed to create item: ${error}`)
  }

  return response.json()
}

export async function getItems(): Promise<Item[]> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE}/api/items`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch items')
  }

  const data = await response.json()
  return data.items
}

export async function getItem(itemId: string): Promise<Item> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE}/api/items/${itemId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Item not found')
  }

  return response.json()
}

export async function updateItem(itemId: string, updates: Partial<ItemFormData>): Promise<Item> {
  const token = await getAuthToken()
  const formData = new FormData()

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'images') {
        (value as File[]).forEach((file) => {
          formData.append('images', file)
        })
      } else {
        formData.append(key, String(value))
      }
    }
  })

  const response = await fetch(`${API_BASE}/api/items/${itemId}`, {
    method: 'PUT',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to update item')
  }

  return response.json()
}

export async function removeBackground(imageUrl: string): Promise<Blob> {
  // Fetch the image from URL
  const imageResponse = await fetch(imageUrl)
  const imageBlob = await imageResponse.blob()

  // Create a File with explicit type
  const imageFile = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' })

  // Send to backend for processing
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

export async function updateItemImage(
  itemId: string,
  imageIndex: number,
  newImageBlob: Blob
): Promise<Item> {
  const token = await getAuthToken()
  const formData = new FormData()

  formData.append('image_index', imageIndex.toString())
  formData.append('image', newImageBlob, 'processed.jpg')

  const response = await fetch(`${API_BASE}/api/items/${itemId}/image`, {
    method: 'PUT',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to update image')
  }

  return response.json()
}

export async function deleteItemImage(
  itemId: string,
  imageIndex: number
): Promise<Item> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE}/api/items/${itemId}/image/${imageIndex}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete image')
  }

  return response.json()
}

export async function deleteItem(itemId: string): Promise<void> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE}/api/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete item')
  }
}

export async function createCollage(imageUrls: string[], columns: number = 2): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/create-collage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_urls: imageUrls,
      columns: columns,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create collage')
  }

  return response.blob()
}

export async function addItemImages(
  itemId: string,
  images: File[]
): Promise<Item> {
  const token = await getAuthToken()
  const formData = new FormData()

  images.forEach((file) => {
    formData.append('images', file)
  })

  const response = await fetch(`${API_BASE}/api/items/${itemId}/images`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to add images')
  }

  return response.json()
}

export async function generatePostDescription(items: Item[]): Promise<string> {
  const response = await fetch(`${API_BASE}/api/generate-description`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: items.map(item => ({
        title: item.title,
        brand: item.brand,
        size: item.size,
        condition: item.condition,
        price: item.price,
        category: item.category,
      })),
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to generate description')
  }

  const data = await response.json()
  return data.description
}

export async function uploadCollage(collageBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('image', collageBlob, 'collage.jpg')

  const response = await fetch(`${API_BASE}/api/upload-collage`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload collage')
  }

  const data = await response.json()
  return data.url
}

export async function getSavedPosts(): Promise<Post[]> {
  const response = await fetch(`${API_BASE}/api/posts`)

  if (!response.ok) {
    throw new Error('Failed to fetch saved posts')
  }

  const data = await response.json()
  return data.posts
}

export async function savePost(
  itemIds: string[],
  description?: string,
  collageUrl?: string
): Promise<Post> {
  const response = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      item_ids: itemIds,
      description: description || null,
      collage_url: collageUrl || null,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to save post')
  }

  return response.json()
}

export async function updateItemsStatus(
  itemIds: string[],
  status: ItemStatus
): Promise<void> {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE}/api/items/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      item_ids: itemIds,
      status: status,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to update items status')
  }
}

export async function getPublications(): Promise<Publication[]> {
  const response = await fetch(`${API_BASE}/api/publications`)

  if (!response.ok) {
    throw new Error('Failed to fetch publications')
  }

  const data = await response.json()
  return data.publications
}

export async function createPublication(
  itemIds: string[],
  fbPageName: string,
  postId?: string,
  description?: string,
  collageUrl?: string
): Promise<Publication> {
  const response = await fetch(`${API_BASE}/api/publications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_id: postId || null,
      item_ids: itemIds,
      fb_page_name: fbPageName,
      description: description || null,
      collage_url: collageUrl || null,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to record publication')
  }

  return response.json()
}
