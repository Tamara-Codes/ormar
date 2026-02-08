import { useEffect, useMemo, useState } from 'react'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { getDefaultConditions, getDefaultMaterials } from '../lib/lookups'
import type { FilterState, Condition, Material } from '../types'

interface FilterModalProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableSizes: string[]
  availableBrands: string[]
  onApply: () => void
  onCancel: () => void
  onClearAll: () => void
}

export function FilterModal({
  filters,
  onFiltersChange,
  availableSizes,
  availableBrands,
  onApply,
  onCancel,
  onClearAll,
}: FilterModalProps) {
  const [brandQuery, setBrandQuery] = useState('')
  const [conditions, setConditions] = useState<Array<{ value: string; label: string }>>([])
  const [materials, setMaterials] = useState<Array<{ value: string; label: string }>>([])
  const [lookupsError, setLookupsError] = useState('')
  // Guard against undefined filters during dialog animation
  if (!filters?.sizes || !filters?.brands || !filters?.conditions || !filters?.materials) {
    return null
  }

  const handleSizeToggle = (size: string) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size]
    onFiltersChange({ ...filters, sizes: newSizes })
  }

  const handleBrandToggle = (brand: string) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand]
    onFiltersChange({ ...filters, brands: newBrands })
  }

  const handleConditionToggle = (condition: Condition) => {
    const newConditions = filters.conditions.includes(condition)
      ? filters.conditions.filter((c) => c !== condition)
      : [...filters.conditions, condition]
    onFiltersChange({ ...filters, conditions: newConditions })
  }

  const handleMaterialToggle = (material: Material) => {
    const newMaterials = filters.materials.includes(material)
      ? filters.materials.filter((m) => m !== material)
      : [...filters.materials, material]
    onFiltersChange({ ...filters, materials: newMaterials })
  }

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [conditionsData, materialsData] = await Promise.all([
          getDefaultConditions(),
          getDefaultMaterials(),
        ])
        setConditions(conditionsData)
        setMaterials(materialsData)
        setLookupsError('')
      } catch (err) {
        console.error('Failed to load conditions/materials:', err)
        setConditions([])
        setMaterials([])
        setLookupsError('Nije moguće učitati stanja i materijale')
      }
    }

    void loadLookups()
  }, [])

  const filteredBrands = useMemo(() => {
    const query = brandQuery.trim().toLowerCase()
    if (!query) return availableBrands
    return availableBrands.filter((brand) => brand.toLowerCase().includes(query))
  }, [availableBrands, brandQuery])

  const activeCount =
    filters.sizes.length +
    filters.brands.length +
    filters.conditions.length +
    filters.materials.length

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Size Section */}
          <div>
          <h3 className="text-sm font-medium mb-3">Veličina</h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {availableSizes.map((size) => (
              <label key={size} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.sizes.includes(size)}
                  onCheckedChange={() => handleSizeToggle(size)}
                />
                <span className="text-sm">{size}</span>
              </label>
            ))}
          </div>
          </div>

          {/* Brand Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Brend</h3>
            <Input
              placeholder="Pretraži brendove..."
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              className="mb-10"
            />
            <div className="space-y-2 max-h-40 overflow-y-auto pt-2">
              {filteredBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema rezultata</p>
              ) : (
                filteredBrands.map((brand) => (
                  <label key={brand} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.brands.includes(brand)}
                      onCheckedChange={() => handleBrandToggle(brand)}
                    />
                    <span className="text-sm">{brand}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Condition Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Stanje</h3>
            <div className="grid grid-cols-2 gap-2">
              {lookupsError ? (
                <p className="text-sm text-muted-foreground">{lookupsError}</p>
              ) : conditions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema dostupnih stanja</p>
              ) : (
                conditions.map((condition) => (
                  <label key={condition.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.conditions.includes(condition.value as Condition)}
                      onCheckedChange={() => handleConditionToggle(condition.value as Condition)}
                    />
                    <span className="text-sm">{condition.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Material Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Materijal</h3>
            <div className="grid grid-cols-2 gap-2">
              {lookupsError ? (
                <p className="text-sm text-muted-foreground">{lookupsError}</p>
              ) : materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema dostupnih materijala</p>
              ) : (
                materials.map((material) => (
                  <label key={material.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.materials.includes(material.value as Material)}
                      onCheckedChange={() => handleMaterialToggle(material.value as Material)}
                    />
                    <span className="text-sm">{material.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-4 mt-4 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          disabled={activeCount === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Očisti sve
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Otkaži
          </Button>
          <Button
            size="sm"
            onClick={onApply}
          >
            Primijeni
          </Button>
        </div>
      </div>
    </div>
  )
}
