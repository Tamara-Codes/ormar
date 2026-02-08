import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getAllCategories } from '../lib/categories'
import { AddCategoryDialog } from './AddCategoryDialog'

interface CategoryTabsProps {
  selected: string
  onChange: (category: string) => void
  refreshKey?: number
}

export function CategoryTabs({ selected, onChange, refreshKey }: CategoryTabsProps) {
  const [categories, setCategories] = useState<Array<{ value: string; label: string; isCustom: boolean }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [refreshKey])

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      const cats = await getAllCategories()
      setCategories(cats)
      if (!cats.some((cat) => cat.value === selected)) {
        onChange('all')
      }
    } catch (err) {
      console.error('Error loading categories:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCategoryAdded = () => {
    loadCategories()
  }

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div className="px-4 py-2 rounded-full bg-card border border-border animate-pulse" />
        <div className="px-4 py-2 rounded-full bg-card border border-border animate-pulse" />
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => {
          const isSelected = selected === category.value
          return (
            <button
              key={category.value}
              onClick={() => onChange(category.value)}
              className={`
                px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap
                transition-all duration-200
                ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground border border-border'
                }
              `}
            >
              {category.label}
            </button>
          )
        })}
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground border border-border transition-all duration-200 flex items-center gap-1.5"
          title="Dodaj kategoriju"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj</span>
        </button>
      </div>
      <AddCategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCategoryAdded={handleCategoryAdded}
      />
    </>
  )
}

