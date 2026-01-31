import { supabase } from './supabase'
import type { AIAnalysis, Item, ItemFormData } from '../types'

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
