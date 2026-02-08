import { Settings } from 'lucide-react'

interface SettingsButtonProps {
  onClick: () => void
}

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative h-9 w-9 flex items-center justify-center border border-border bg-card rounded-md hover:bg-card/80 transition-colors"
      title="Postavke kategorija"
    >
      <Settings className="h-4 w-4" />
    </button>
  )
}

