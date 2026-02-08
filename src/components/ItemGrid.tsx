import { ItemCard } from './ItemCard'
import type { Item } from '../types'

interface ItemGridProps {
  items: Item[]
  onDeleteItem?: (item: Item) => void
  onMarkAsSold?: (item: Item) => void
}

export function ItemGrid({ items, onDeleteItem, onMarkAsSold }: ItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <p className="text-muted-foreground font-medium">Nema artikala</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 auto-rows-[calc((100vh-200px)/4)]">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onDelete={onDeleteItem} onMarkAsSold={onMarkAsSold} />
      ))}
    </div>
  )
}
