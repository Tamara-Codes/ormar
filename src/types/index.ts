export type Category = string

export type Condition = string

export type Material = string

export type ItemStatus = 'draft' | 'active' | 'sold'

export interface Item {
  id: string
  title: string
  description: string
  price: number
  category: string
  size?: string
  brand?: string
  condition: Condition
  material?: Material
  color?: string
  images: string[]
  status: ItemStatus
  created_at: string
  updated_at: string
}

export interface AIAnalysis {
  title: string
  category: string
  brand?: string
  size?: string
  estimatedPrice?: number
}

export interface ItemFormData {
  title: string
  description: string
  category: string
  brand?: string
  size?: string
  condition?: Condition
  material?: Material
  color?: string
  price: number
  images: File[]
}

export interface FilterState {
  sizes: string[]
  brands: string[]
  conditions: Condition[]
  materials: Material[]
}

export interface Post {
  id: string
  item_ids: string[]
  description?: string
  collage_url?: string
  created_at: string
  updated_at: string
}

export interface Publication {
  id: string
  post_id?: string
  item_ids: string[]
  fb_page_name: string
  description?: string
  collage_url?: string
  published_at: string
}
