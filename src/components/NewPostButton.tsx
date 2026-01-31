interface NewPostButtonProps {
  onClick: () => void
}

export function NewPostButton({ onClick }: NewPostButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-background via-background to-transparent">
      <button onClick={onClick} className="btn-primary w-full flex items-center justify-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Novi Artikal
      </button>
    </div>
  )
}
