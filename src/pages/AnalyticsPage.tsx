import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader } from 'lucide-react'
import { getPublications, getItems } from '../lib/api'
import type { Publication, Item } from '../types'

export function AnalyticsPage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<Publication[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterPage, setFilterPage] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubs, allItems] = await Promise.all([
          getPublications(),
          getItems(),
        ])
        setPublications(pubs)
        setItems(allItems)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Get unique page names for filter
  const pageNames = Array.from(new Set(publications.map(p => p.fb_page_name)))

  // Filter publications
  const filteredPublications = filterPage === 'all'
    ? publications
    : publications.filter(p => p.fb_page_name === filterPage)

  // Get item details by ID
  const getItemById = (id: string) => items.find(item => item.id === id)

  // Stats
  const totalPublications = publications.length
  const thisWeekPublications = publications.filter(p => {
    const pubDate = new Date(p.published_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return pubDate >= weekAgo
  }).length

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Analitika</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{totalPublications}</p>
                <p className="text-xs text-muted-foreground">Ukupno objava</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{thisWeekPublications}</p>
                <p className="text-xs text-muted-foreground">Ovaj tjedan</p>
              </div>
            </div>

            {/* Filter */}
            {pageNames.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Filtriraj po stranici</label>
                <select
                  value={filterPage}
                  onChange={(e) => setFilterPage(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="all">Sve stranice</option>
                  {pageNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Publications List */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Povijest objava ({filteredPublications.length})
              </label>
              {filteredPublications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nema objava za prikaz
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredPublications.map((pub) => (
                    <div
                      key={pub.id}
                      className="border border-border rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        {pub.collage_url ? (
                          <img
                            src={pub.collage_url}
                            alt="Kolaž"
                            className="w-16 h-16 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-sm text-muted-foreground">
                              {pub.item_ids.length}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-primary">
                              {pub.fb_page_name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {new Date(pub.published_at).toLocaleDateString('hr-HR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {pub.description && (
                            <p className="text-sm text-foreground line-clamp-2 mb-2">
                              {pub.description}
                            </p>
                          )}
                          {/* Item thumbnails */}
                          <div className="flex gap-1 flex-wrap">
                            {pub.item_ids.slice(0, 5).map((itemId) => {
                              const item = getItemById(itemId)
                              return item?.images[0] ? (
                                <img
                                  key={itemId}
                                  src={item.images[0]}
                                  alt={item.title}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <div
                                  key={itemId}
                                  className="w-8 h-8 rounded bg-muted"
                                />
                              )
                            })}
                            {pub.item_ids.length > 5 && (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  +{pub.item_ids.length - 5}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
