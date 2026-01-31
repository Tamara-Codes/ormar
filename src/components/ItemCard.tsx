import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { Item } from '../types'

interface ItemCardProps {
  item: Item
  onDelete?: (item: Item) => void
}

export function ItemCard({ item, onDelete }: ItemCardProps) {
  const navigate = useNavigate()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(item)
  }

  return (
    <div
      onClick={() => navigate(`/item/${item.id}`)}
      className="bg-card rounded border border-border overflow-hidden active:scale-[0.98] transition-transform cursor-pointer h-full flex flex-col">
      <div className="flex-1 relative bg-muted min-h-0">
        {item.images[0] ? (
          <img
            src={item.images[0]}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="absolute top-0.5 left-0.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="px-1.5 py-1 flex items-center justify-between">
        <span className="text-xs font-bold text-primary">{item.price}€</span>
        {item.size && (
          <span className="text-[10px] text-muted-foreground">{item.size}</span>
        )}
      </div>
    </div>
  )
}
