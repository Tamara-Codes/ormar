export type ItemStatus = 'draft' | 'ready' | 'sold'

export type Category = 'odjeca' | 'obuca' | 'oprema' | 'igracke'

export type Condition = 'novo' | 'kao_novo' | 'dobro' | 'koristeno'

export type Material = 'pamuk' | 'vuna' | 'poliester' | 'mješavina'

export const CATEGORY_LABELS: Record<Category, string> = {
  odjeca: 'Odjeća',
  obuca: 'Obuća',
  oprema: 'Oprema',
  igracke: 'Igračke',
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  draft: 'Nacrt',
  ready: 'Spremno',
  sold: 'Prodano',
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
  status: ItemStatus
  images: string[]
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
  statuses: ItemStatus[]
}
