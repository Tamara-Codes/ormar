import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { CONDITION_LABELS, MATERIAL_LABELS, type FilterState, type Condition, type Material } from '../types'

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

  const handleBrandSearch = () => {
    // For now, just filter the displayed brands
    // In a real app, you'd implement autocomplete
  }

  const activeCount =
    filters.sizes.length +
    filters.brands.length +
    filters.conditions.length +
    filters.materials.length

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-6 pb-4">
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
          <div className="border-b border-border mt-4 mb-4" />
        </div>

        {/* Brand Section */}
        <div>
          <h3 className="text-sm font-medium mb-3">Brend</h3>
          <Input
            placeholder="Pretraži brendove..."
            onChange={() => handleBrandSearch()}
            className="mb-3"
          />
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableBrands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.brands.includes(brand)}
                  onCheckedChange={() => handleBrandToggle(brand)}
                />
                <span className="text-sm">{brand}</span>
              </label>
            ))}
          </div>
          <div className="border-b border-border mt-4 mb-4" />
        </div>

        {/* Condition Section */}
        <div>
          <h3 className="text-sm font-medium mb-3">Stanje</h3>
          <div className="space-y-2">
            {(Object.keys(CONDITION_LABELS) as Condition[]).map((condition) => (
              <label key={condition} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.conditions.includes(condition)}
                  onCheckedChange={() => handleConditionToggle(condition)}
                />
                <span className="text-sm">{CONDITION_LABELS[condition]}</span>
              </label>
            ))}
          </div>
          <div className="border-b border-border mt-4 mb-4" />
        </div>

        {/* Material Section */}
        <div>
          <h3 className="text-sm font-medium mb-3">Materijal</h3>
          <div className="space-y-2">
            {(Object.keys(MATERIAL_LABELS) as Material[]).map((material) => (
              <label key={material} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.materials.includes(material)}
                  onCheckedChange={() => handleMaterialToggle(material)}
                />
                <span className="text-sm">{MATERIAL_LABELS[material]}</span>
              </label>
            ))}
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
