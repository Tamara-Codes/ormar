import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import type { ItemFormData, Condition, Material, Category } from '../types'
import { CONDITION_LABELS, MATERIAL_LABELS, CATEGORY_LABELS } from '../types'

interface ItemFormProps {
  initialData?: Partial<ItemFormData>
  onSubmit: (data: ItemFormData) => Promise<void>
  isLoading?: boolean
}

export function ItemForm({ initialData, onSubmit, isLoading = false }: ItemFormProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    title: initialData?.title || '',
    description: '',
    category: initialData?.category || 'odjeca',
    brand: initialData?.brand || '',
    size: initialData?.size || '',
    condition: initialData?.condition,
    material: initialData?.material,
    color: initialData?.color || '',
    price: initialData?.price || 0,
    images: initialData?.images || [],
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.title || !formData.category || !formData.price || !formData.size || !formData.brand) {
      setError('Molimo popunite sva obavezna polja')
      return
    }

    if (!formData.condition) {
      setError('Molimo odaberite stanje')
      return
    }

    if (formData.images.length === 0) {
      setError('Molimo dodajte najmanje jednu fotografiju')
      return
    }

    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri spremanju')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Main info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Naslov <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            placeholder="Npr. Zimska jakna H&M"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Kategorija <span className="text-primary">*</span>
            </label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as Category })}
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
              value={formData.condition || ''}
              onValueChange={(value) => setFormData({ ...formData, condition: value as Condition })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Odaberite..." />
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
              required
              step="0.01"
              min="0"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="25.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Veličina <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.size || ''}
              onChange={(e) => setFormData({ ...formData, size: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="92, M, 38..."
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
              required
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="H&M, Zara..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Boja</label>
            <input
              type="text"
              value={formData.color || ''}
              onChange={(e) => setFormData({ ...formData, color: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="Plava, crvena..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Materijal</label>
          <Select
            value={formData.material || ''}
            onValueChange={(value) => setFormData({ ...formData, material: value as Material || undefined })}
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
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isLoading ? 'Spremanje...' : 'Spremi objavu'}
      </button>
    </form>
  )
}
