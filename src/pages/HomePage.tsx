import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { CategoryTabs } from '../components/CategoryTabs'
import { FilterButton } from '../components/FilterButton'
import { SettingsButton } from '../components/SettingsButton'
import { ItemGrid } from '../components/ItemGrid'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { FilterModal } from '../components/FilterModal'
import { CategorySettingsDialog } from '../components/CategorySettingsDialog'
import { getItems, deleteItem } from '../lib/api'
import { markItemAsSold } from '../lib/sales'
import { useAuth } from '../contexts/AuthContext'
import type { Item, FilterState } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false)
  const [categoriesVersion, setCategoriesVersion] = useState(0)

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
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [itemToSell, setItemToSell] = useState<Item | null>(null)
  const [isMarkingSold, setIsMarkingSold] = useState(false)

  const emptyFilters: FilterState = {
    sizes: [],
    brands: [],
    conditions: [],
    materials: [],
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

    return true
  })

  const activeFilterCount =
    appliedFilters.sizes.length +
    appliedFilters.brands.length +
    appliedFilters.conditions.length +
    appliedFilters.materials.length

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

  const handleNewItem = () => {
    navigate('/add-item')
  }

  const handlePreparePost = () => {
    navigate('/prepare-post')
  }

  const handleLogout = async () => {
    await signOut()
    setShowLogoutConfirm(false)
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      await deleteItem(itemToDelete.id)
      setItems(items.filter(i => i.id !== itemToDelete.id))
      setItemToDelete(null)
    } catch (err) {
      console.error('Failed to delete item:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkAsSold = async () => {
    if (!itemToSell) return
    setIsMarkingSold(true)
    try {
      await markItemAsSold(itemToSell)
      setItems(items.filter(i => i.id !== itemToSell.id))
      setItemToSell(null)
    } catch (err) {
      console.error('Failed to mark item as sold:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark item as sold')
    } finally {
      setIsMarkingSold(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        {/* Top bar with logo and profile */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Komodus" className="w-8 h-8 object-contain" />
            <span className="text-3xl font-display font-bold text-foreground tracking-wider" style={{ fontFamily: "'Amatic SC', cursive" }}>Komodus</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/analytics')}
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <img src="/analytics-icon.png" alt="Analitika" className="w-11 h-11" />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Odjava"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <CategoryTabs
            selected={selectedCategory}
            onChange={setSelectedCategory}
            refreshKey={categoriesVersion}
          />
          <div className="flex items-center gap-2">
            <FilterButton
              activeCount={activeFilterCount}
              onClick={handleOpenModal}
            />
            <SettingsButton
              onClick={() => setIsCategorySettingsOpen(true)}
            />
          </div>
        </div>
      </header>

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Filteri</DialogTitle>
          </DialogHeader>
          {isFilterModalOpen && (
            <FilterModal
              filters={workingFilters}
              onFiltersChange={setWorkingFilters}
              availableSizes={availableSizes}
              availableBrands={availableBrands}
              onApply={handleApplyFilters}
              onCancel={handleCancelFilters}
              onClearAll={handleClearFilters}
            />
          )}
        </DialogContent>
      </Dialog>

      <CategorySettingsDialog
        open={isCategorySettingsOpen}
        onOpenChange={setIsCategorySettingsOpen}
        onCategoriesUpdated={() => setCategoriesVersion((prev) => prev + 1)}
      />

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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <img
              src="/empty-closet.jpg"
              alt="Prazan ormar"
              className="w-64 h-64 object-contain mb-4"
            />
            <h3 className="text-lg font-medium text-foreground mb-2">Tvoj ormar je prazan</h3>
            <p className="text-muted-foreground text-sm">Dodaj prvi artikl i počni prodavati!</p>
          </div>
        ) : (
          <ItemGrid items={filteredItems} onDeleteItem={setItemToDelete} onMarkAsSold={setItemToSell} />
        )}
      </main>

      <div className="fixed bottom-6 left-4 right-4">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleNewItem}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novi Artikal
          </button>
          <button
            onClick={handlePreparePost}
            className="w-full py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Pripremi post
          </button>
        </div>
      </div>

      {/* Mark as sold confirmation popup */}
      {itemToSell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-4 mx-4 max-w-sm w-full shadow-lg">
            <p className="text-center mb-4">
              Označi "<span className="font-medium">{itemToSell.title}</span>" kao prodano?
            </p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Artikl će biti obrisan, ali će prodaja biti zabilježena u analitici.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToSell(null)}
                disabled={isMarkingSold}
                className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Odustani
              </button>
              <button
                onClick={handleMarkAsSold}
                disabled={isMarkingSold}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isMarkingSold ? 'Spremanje...' : 'Prodano'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation popup */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-4 mx-4 max-w-sm w-full shadow-lg">
            <p className="text-center mb-4">
              Jeste li sigurni da želite obrisati "<span className="font-medium">{itemToDelete.title}</span>"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Odustani
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Brisanje...' : 'Obriši'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation popup */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-4 mx-4 max-w-sm w-full shadow-lg">
            <p className="text-center mb-4">Jeste li sigurni da se želite odjaviti?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Odustani
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Odjavi se
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
