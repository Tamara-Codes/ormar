import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { useEffect, useState } from 'react'
import { getAllCategories } from '../lib/categories'
import type { Category } from '../types'

interface CategoryDropdownProps {
  selected: Category | 'all'
  onChange: (category: Category | 'all') => void
}

export function CategoryDropdown({ selected, onChange }: CategoryDropdownProps) {
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getAllCategories()
        setCategories(data)
      } catch (err) {
        console.error('Failed to load categories:', err)
        setCategories([{ value: 'all', label: 'Sve kategorije' }])
      }
    }

    loadCategories()
  }, [])

  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Sve kategorije" />
      </SelectTrigger>
      <SelectContent>
        {(categories.length > 0 ? categories : [{ value: 'all', label: 'Sve kategorije' }]).map((category) => (
          <SelectItem key={category.value} value={category.value}>
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
