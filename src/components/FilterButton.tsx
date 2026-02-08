import { Filter } from 'lucide-react'

interface FilterButtonProps {
  activeCount: number
  onClick: () => void
}

export function FilterButton({ activeCount, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative h-9 w-9 flex items-center justify-center border border-border bg-card rounded-md hover:bg-card/80 transition-colors"
    >
      <Filter className="h-4 w-4" />
      {activeCount > 0 && (
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full h-4 w-4 flex items-center justify-center">
          {activeCount}
        </div>
      )}
    </button>
  )
}
