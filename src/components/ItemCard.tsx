import { useNavigate } from 'react-router-dom'
import { STATUS_LABELS, type Item } from '../types'

interface ItemCardProps {
  item: Item
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate()

  const statusClass = {
    draft: 'status-draft',
    ready: 'status-ready',
    sold: 'status-sold',
  }[item.status]

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
        <span className={`status-badge ${statusClass} absolute top-0.5 right-0.5`}>
          {STATUS_LABELS[item.status]}
        </span>
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
