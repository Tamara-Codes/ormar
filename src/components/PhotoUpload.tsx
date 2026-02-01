import { useState, useRef } from 'react'
import { Upload, X, Camera, Image } from 'lucide-react'
import { isNative, takePhoto, pickFromGallery, pickMultipleFromGallery, photoToFile } from '../lib/native'

interface PhotoUploadProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
  maxPhotos?: number
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 5 }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
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

  // Native camera functions
  const handleTakePhoto = async () => {
    try {
      setShowOptions(false)
      const photo = await takePhoto()
      const file = await photoToFile(photo)
      const newPhotos = [...photos, file].slice(0, maxPhotos)
      onPhotosChange(newPhotos)
    } catch (error) {
      console.error('Error taking photo:', error)
    }
  }

  const handlePickFromGallery = async () => {
    try {
      setShowOptions(false)
      if (photos.length < maxPhotos - 1) {
        // Allow picking multiple if we have space
        const selectedPhotos = await pickMultipleFromGallery()
        const files = await Promise.all(
          selectedPhotos.map((photo, index) => photoToFile(photo, `gallery_${Date.now()}_${index}.jpeg`))
        )
        const newPhotos = [...photos, ...files].slice(0, maxPhotos)
        onPhotosChange(newPhotos)
      } else {
        // Only one slot left, pick single
        const photo = await pickFromGallery()
        const file = await photoToFile(photo)
        const newPhotos = [...photos, file].slice(0, maxPhotos)
        onPhotosChange(newPhotos)
      }
    } catch (error) {
      console.error('Error picking from gallery:', error)
    }
  }

  const handleUploadClick = () => {
    if (isNative()) {
      setShowOptions(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  const remainingSlots = maxPhotos - photos.length

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
        } ${remainingSlots === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => remainingSlots > 0 && handleUploadClick()}
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

      {/* Native options modal */}
      {showOptions && isNative() && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setShowOptions(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleTakePhoto}
              className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Camera className="w-6 h-6 text-blue-500" />
              <span className="font-medium text-gray-900">Uslikaj kamerom</span>
            </button>
            <button
              onClick={handlePickFromGallery}
              className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Image className="w-6 h-6 text-green-500" />
              <span className="font-medium text-gray-900">Odaberi iz galerije</span>
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="w-full p-4 text-gray-500 font-medium"
            >
              Odustani
            </button>
          </div>
        </div>
      )}

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
