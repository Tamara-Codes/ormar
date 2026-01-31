import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryDropdown } from '../components/CategoryDropdown'
import { FilterButton } from '../components/FilterButton'
import { ItemGrid } from '../components/ItemGrid'
import { NewPostButton } from '../components/NewPostButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { FilterModal } from '../components/FilterModal'
import { getItems } from '../lib/api'
import type { Category, Item, FilterState } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true)
        const fetchedItems = await getItems()
        setItems(fetchedItems)
        console.log(`[HOME] Loaded ${fetchedItems.length} items`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load items'
        console.error('[HOME] Error loading items:', errorMessage)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchItems()
  }, [])
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const emptyFilters: FilterState = {
    sizes: [],
    brands: [],
    conditions: [],
    materials: [],
    statuses: [],
  }

  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters)
  const [workingFilters, setWorkingFilters] = useState<FilterState>(appliedFilters)

  // Extract available options from items
  const availableSizes = Array.from(new Set(items.map((i) => i.size).filter((s): s is string => Boolean(s)))).sort()
  const availableBrands = Array.from(new Set(items.map((i) => i.brand).filter((b): b is string => Boolean(b)))).sort()

  const filteredItems = items.filter((item) => {
    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false
    }

    // Size: OR logic within field
    if (appliedFilters.sizes.length > 0 &&
        (!item.size || !appliedFilters.sizes.includes(item.size))) {
      return false
    }

    // Brand: OR logic within field
    if (appliedFilters.brands.length > 0 &&
        (!item.brand || !appliedFilters.brands.includes(item.brand))) {
      return false
    }

    // Condition: OR logic within field
    if (appliedFilters.conditions.length > 0 &&
        !appliedFilters.conditions.includes(item.condition)) {
      return false
    }

    // Material: OR logic within field
    if (appliedFilters.materials.length > 0 &&
        (!item.material || !appliedFilters.materials.includes(item.material))) {
      return false
    }

    // Status: OR logic within field
    if (appliedFilters.statuses.length > 0 &&
        !appliedFilters.statuses.includes(item.status)) {
      return false
    }

    return true
  })

  const activeFilterCount =
    appliedFilters.sizes.length +
    appliedFilters.brands.length +
    appliedFilters.conditions.length +
    appliedFilters.materials.length +
    appliedFilters.statuses.length

  const handleOpenModal = () => {
    setWorkingFilters(appliedFilters)
    setIsFilterModalOpen(true)
  }

  const handleApplyFilters = () => {
    setAppliedFilters(workingFilters)
    setIsFilterModalOpen(false)
  }

  const handleCancelFilters = () => {
    setWorkingFilters(appliedFilters)
    setIsFilterModalOpen(false)
  }

  const handleClearFilters = () => {
    setWorkingFilters(emptyFilters)
  }

  const handleNewPost = () => {
    navigate('/add-item')
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Ormar</h1>
        </div>
        <div className="px-4 pb-3 space-y-3">
          <CategoryDropdown
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
          <FilterButton
            activeCount={activeFilterCount}
            onClick={handleOpenModal}
          />
        </div>
      </header>

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Filteri</DialogTitle>
          </DialogHeader>
          <FilterModal
            filters={workingFilters}
            onFiltersChange={setWorkingFilters}
            availableSizes={availableSizes}
            availableBrands={availableBrands}
            onApply={handleApplyFilters}
            onCancel={handleCancelFilters}
            onClearAll={handleClearFilters}
          />
        </DialogContent>
      </Dialog>

      <main className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="relative w-8 h-8 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-border border-t-primary animate-spin"></div>
              </div>
              <p className="text-foreground text-sm">Organiziranje ormara...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground text-sm">Nema oglasa. Kreniite s dodavanjem!</p>
          </div>
        ) : (
          <ItemGrid items={filteredItems} />
        )}
      </main>

      <NewPostButton onClick={handleNewPost} />
    </div>
  )
}
