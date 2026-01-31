import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, ChevronLeft, ChevronRight, Sparkles, Loader } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { getItem, updateItem, removeBackground, updateItemImage } from '../lib/api'
import type { Item, Category, Condition, Material } from '../types'
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  MATERIAL_LABELS,
} from '../types'

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isRemovingBg, setIsRemovingBg] = useState(false)

  // Edit form state
  const [editData, setEditData] = useState({
    title: '',
    category: '' as Category,
    brand: '',
    size: '',
    condition: '' as Condition,
    material: '' as Material | '',
    color: '',
    price: 0,
  })

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return
      try {
        setIsLoading(true)
        const fetchedItem = await getItem(id)
        setItem(fetchedItem)
        setEditData({
          title: fetchedItem.title,
          category: fetchedItem.category,
          brand: fetchedItem.brand || '',
          size: fetchedItem.size || '',
          condition: fetchedItem.condition,
          material: fetchedItem.material || '',
          color: fetchedItem.color || '',
          price: fetchedItem.price,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item')
      } finally {
        setIsLoading(false)
      }
    }
    fetchItem()
  }, [id])

  const handleSave = async () => {
    if (!id) return
    setIsSaving(true)
    try {
      const updated = await updateItem(id, {
        title: editData.title,
        category: editData.category,
        brand: editData.brand || undefined,
        size: editData.size || undefined,
        condition: editData.condition,
        material: editData.material as Material || undefined,
        color: editData.color || undefined,
        price: editData.price,
      })
      setItem(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrevImage = () => {
    if (!item) return
    setCurrentImageIndex((prev) =>
      prev === 0 ? item.images.length - 1 : prev - 1
    )
  }

  const handleNextImage = () => {
    if (!item) return
    setCurrentImageIndex((prev) =>
      prev === item.images.length - 1 ? 0 : prev + 1
    )
  }

  const handleRemoveBackground = async () => {
    if (!item || !id) return
    const imageUrl = item.images[currentImageIndex]
    if (!imageUrl) return

    setIsRemovingBg(true)
    try {
      // Remove background
      const processedBlob = await removeBackground(imageUrl)
      // Upload and update item
      const updatedItem = await updateItemImage(id, currentImageIndex, processedBlob)
      setItem(updatedItem)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove background')
    } finally {
      setIsRemovingBg(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-8 h-8 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-border border-t-primary animate-spin"></div>
          </div>
          <p className="text-foreground text-sm">Učitavanje...</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <ArrowLeft className="w-6 h-6" />
            <h1 className="text-lg font-bold">Greška</h1>
          </div>
        </header>
        <main className="px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error || 'Artikl nije pronađen'}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 flex-shrink-0 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <ArrowLeft className="w-6 h-6" />
            <h1 className="text-lg font-bold truncate">{item.title}</h1>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Image Gallery */}
        <div className="relative bg-black h-[40vh] flex-shrink-0">
          {item.images.length > 0 ? (
            <>
              <img
                src={item.images[currentImageIndex]}
                alt={item.title}
                className="w-full h-full object-contain"
              />
              {item.images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {item.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground text-sm">Nema slike</span>
            </div>
          )}
        </div>

        {/* Magic Button - below image */}
        {!isEditing && item.images.length > 0 && (
          <div className="px-4 py-1.5 flex-shrink-0">
            <button
              onClick={handleRemoveBackground}
              disabled={isRemovingBg}
              className="w-full bg-card border border-border text-foreground px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1.5 hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {isRemovingBg ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-primary" />
              )}
              {isRemovingBg ? 'Obrada...' : 'Ukloni pozadinu'}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-3 flex-shrink-0">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Naslov <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Kategorija <span className="text-primary">*</span>
                  </label>
                  <Select
                    value={editData.category}
                    onValueChange={(value) => setEditData({ ...editData, category: value as Category })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Stanje <span className="text-primary">*</span>
                  </label>
                  <Select
                    value={editData.condition}
                    onValueChange={(value) => setEditData({ ...editData, condition: value as Condition })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cijena (€) <span className="text-primary">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.price || ''}
                    onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Veličina <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.size}
                    onChange={(e) => setEditData({ ...editData, size: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Brend <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.brand}
                    onChange={(e) => setEditData({ ...editData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Boja</label>
                  <input
                    type="text"
                    value={editData.color}
                    onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Materijal</label>
                <Select
                  value={editData.material}
                  onValueChange={(value) => setEditData({ ...editData, material: value as Material })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberite materijal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MATERIAL_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Odustani
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSaving ? 'Spremanje...' : 'Spremi'}
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-3">
              <p className="text-2xl font-bold text-primary">{item.price} €</p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kategorija</span>
                  <span className="font-medium">{CATEGORY_LABELS[item.category]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stanje</span>
                  <span className="font-medium">{CONDITION_LABELS[item.condition]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brend</span>
                  <span className="font-medium">{item.brand || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Veličina</span>
                  <span className="font-medium">{item.size || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Materijal</span>
                  <span className="font-medium">{item.material ? MATERIAL_LABELS[item.material] : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boja</span>
                  <span className="font-medium">{item.color || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
