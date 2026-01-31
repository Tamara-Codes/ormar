export type Category = 'odjeca' | 'obuca' | 'oprema' | 'igracke'

export type Condition = 'novo' | 'kao_novo' | 'dobro' | 'koristeno'

export type Material = 'pamuk' | 'vuna' | 'poliester' | 'mješavina'

export const CATEGORY_LABELS: Record<Category, string> = {
  odjeca: 'Odjeća',
  obuca: 'Obuća',
  oprema: 'Oprema',
  igracke: 'Igračke',
}

export const CONDITION_LABELS: Record<Condition, string> = {
  novo: 'Novo',
  kao_novo: 'Kao novo',
  dobro: 'Dobro',
  koristeno: 'Korišteno',
}

export const MATERIAL_LABELS: Record<Material, string> = {
  pamuk: 'Pamuk',
  vuna: 'Vuna',
  poliester: 'Poliester',
  mješavina: 'Mješavina',
}

export type ItemStatus = 'draft' | 'active' | 'sold'

export interface Item {
  id: string
  title: string
  description: string
  price: number
  category: Category
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
  category: Category
  brand?: string
  size?: string
  estimatedPrice?: number
}

export interface ItemFormData {
  title: string
  description: string
  category: Category
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
