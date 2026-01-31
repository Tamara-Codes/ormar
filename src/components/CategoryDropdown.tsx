import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { CATEGORY_LABELS, type Category } from '../types'

interface CategoryDropdownProps {
  selected: Category | 'all'
  onChange: (category: Category | 'all') => void
}

export function CategoryDropdown({ selected, onChange }: CategoryDropdownProps) {
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Sve kategorije" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Sve kategorije</SelectItem>
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
          <SelectItem key={cat} value={cat}>
            {CATEGORY_LABELS[cat]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
