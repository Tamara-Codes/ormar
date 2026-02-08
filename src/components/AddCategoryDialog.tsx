import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { createCustomCategory } from '../lib/categories'

interface AddCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryAdded: () => void
}

export function AddCategoryDialog({ open, onOpenChange, onCategoryAdded }: AddCategoryDialogProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Unesite ime kategorije')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await createCustomCategory(name.trim())
      setName('')
      onCategoryAdded()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri dodavanju kategorije')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Dodaj novu kategoriju</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="Ime kategorije"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                setName('')
                setError('')
              }}
              disabled={isLoading}
              className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Odustani
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Dodavanje...' : 'Dodaj'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

