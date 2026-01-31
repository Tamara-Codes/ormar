import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader } from 'lucide-react'
import { PhotoUpload } from '../components/PhotoUpload'
import { ItemForm } from '../components/ItemForm'
import { analyzeImage, createItem } from '../lib/api'
import type { ItemFormData } from '../types'

type Step = 'upload' | 'form'

export function AddItemPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [photos, setPhotos] = useState<File[]>([])
  const [formData, setFormData] = useState<Partial<ItemFormData>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [aiAnalyzed, setAiAnalyzed] = useState(false)
  const [error, setError] = useState('')

  const handleNext = async () => {
    if (photos.length === 0) {
      setError('Molimo dodajte najmanje jednu fotografiju')
      return
    }

    setError('')
    setStep('form')
    setIsLoading(true)

    try {
      // Analyze first photo
      const analysis = await analyzeImage(photos[0])
      setFormData({
        title: analysis.title,
        category: analysis.category,
        brand: analysis.brand,
        size: analysis.size,
        price: analysis.estimatedPrice || 0,
      })
      setAiAnalyzed(true)
    } catch (err) {
      // Allow manual fill if AI fails
      console.error('AI analysis failed:', err)
      setAiAnalyzed(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (data: ItemFormData) => {
    setIsLoading(true)
    try {
      // Ensure photos are included
      const itemData = { ...data, images: photos }
      await createItem(itemData)
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'form') {
      setStep('upload')
      setFormData({})
      setAiAnalyzed(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={handleBack}>
          <ArrowLeft className="w-6 h-6 text-gray-600" />
          <h1 className="text-lg font-bold">Nova objava</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 max-w-lg mx-auto">
        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Fotografije</h2>
              <PhotoUpload photos={photos} onPhotosChange={setPhotos} maxPhotos={5} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={photos.length === 0}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  AI analiza...
                </>
              ) : (
                'Nastavi'
              )}
            </button>
          </div>
        )}

        {step === 'form' && (
          <>
            {isLoading && !aiAnalyzed ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-12 h-12 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-border border-t-primary animate-spin"></div>
                </div>
                <p className="text-center text-foreground">AI analiza fotografije...</p>
              </div>
            ) : (
              <ItemForm
                initialData={{ ...formData, images: photos }}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
