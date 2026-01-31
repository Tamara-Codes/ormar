import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'

interface PhotoUploadProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
  maxPhotos?: number
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 5 }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    )

    const newPhotos = [...photos, ...files].slice(0, maxPhotos)
    onPhotosChange(newPhotos)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || [])
    const newPhotos = [...photos, ...files].slice(0, maxPhotos)
    onPhotosChange(newPhotos)

    // Reset input
    e.currentTarget.value = ''
  }

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium">Dodaj fotografije</p>
        <p className="text-xs text-gray-500 mt-1">
          {photos.length}/{maxPhotos} fotografija
        </p>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(photo)}
                alt={`Photo ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => handleRemovePhoto(index)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
