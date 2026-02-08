import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader, Sparkles, Save, ExternalLink, Copy, CheckCheck } from 'lucide-react'
import { createCollage, getItems, generatePostDescription, uploadCollage, savePost, updatePost, getSavedPosts, createPublication, getPublications } from '../lib/api'
import { isNative, copyToClipboard, saveImagesToGallery, deleteLastSavedImages, getLastSavedImagesCount, openFacebook } from '../lib/native'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { getPostGroups, getPostGroup } from '../lib/postGroups'
import type { PostGroup } from '../lib/postGroups'
import { CategorySettingsDialog } from '../components/CategorySettingsDialog'
import type { Item, Post } from '../types'

export function PreparePostPage() {
  const navigate = useNavigate()
  const [allItems, setAllItems] = useState<Item[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // Saved posts state
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [showSavedPosts, setShowSavedPosts] = useState(true)
  const [currentSavedPostId, setCurrentSavedPostId] = useState<string | null>(null)
  const [initialDescription, setInitialDescription] = useState('')
  const [initialCollageUrl, setInitialCollageUrl] = useState<string | null>(null)
  const [initialItemIds, setInitialItemIds] = useState<string[]>([])

  // Description state
  const [description, setDescription] = useState('')
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  // Collage state
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [isCreatingCollage, setIsCreatingCollage] = useState(false)
  const [collageUrl, setCollageUrl] = useState<string | null>(null)
  const [collageBlob, setCollageBlob] = useState<Blob | null>(null)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Publish confirmation popup state
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [isRecordingPublication, setIsRecordingPublication] = useState(false)
  const [knownFbPages, setKnownFbPages] = useState<string[]>([])
  const waitingForFbReturn = useRef(false)
  const publishedItemIds = useRef<string[]>([])
  const currentPostId = useRef<string | null>(null)

  // Clipboard state
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  // Cleanup prompt state
  const [showCleanupPrompt, setShowCleanupPrompt] = useState(false)
  const [isDeletingImages, setIsDeletingImages] = useState(false)
  const [savedImagesCount, setSavedImagesCount] = useState(0)

  // Post Groups state
  const [postGroups, setPostGroups] = useState<PostGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('__none__')
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false)


  const loadPostGroups = async () => {
    try {
      const groups = await getPostGroups()
      setPostGroups(groups)
    } catch (err) {
      console.error('Failed to load post groups:', err)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [items, posts, publications, groups] = await Promise.all([
          getItems(),
          getSavedPosts(),
          getPublications(),
          getPostGroups(),
        ])
        setAllItems(items)
        setSavedPosts(posts)
        setPostGroups(groups)
        // Extract unique page names from publications
        const pageNames = Array.from(new Set(publications.map(p => p.fb_page_name)))
        setKnownFbPages(pageNames)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoadingItems(false)
      }
    }
    fetchData()
  }, [])

  const handleGroupCreated = async (groupId: string) => {
    // Reload groups to get the new one
    await loadPostGroups()
    // Select the newly created group
    setSelectedGroupId(groupId)
    // Close the settings dialog
    setIsGroupSettingsOpen(false)
  }

  // Listen for when user returns from Facebook
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && waitingForFbReturn.current) {
        waitingForFbReturn.current = false
        setShowPublishConfirm(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const selectedItems = allItems.filter(item => selectedItemIds.has(item.id))
  const currentItemIds = Array.from(selectedItemIds).sort()
  const initialItemIdsSorted = [...initialItemIds].sort()
  const hasItemChanges = currentItemIds.length !== initialItemIdsSorted.length ||
    currentItemIds.some((id, index) => id !== initialItemIdsSorted[index])
  const hasDescriptionChanges = description !== initialDescription
  const hasCollageChanges = collageBlob !== null || collageUrl !== initialCollageUrl
  const hasUnsavedChanges = hasItemChanges || hasDescriptionChanges || hasCollageChanges
  const showSavedState = currentSavedPostId !== null && !hasUnsavedChanges

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
    // Clear collage when items change
    setSelectedImages(new Set())
    setCollageUrl(null)
    setCollageBlob(null)
  }

  // Get all images from selected items
  const allImages = selectedItems.flatMap((item) =>
    item.images.map((url, imgIndex) => ({
      id: `${item.id}-${imgIndex}`,
      url,
      itemTitle: item.title,
    }))
  )

  const toggleImage = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(imageId)) {
        newSet.delete(imageId)
      } else {
        newSet.add(imageId)
      }
      return newSet
    })
    // Clear existing collage when selection changes
    setCollageUrl(null)
    setCollageBlob(null)
  }

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true)
    try {
      // Get group rules if a group is selected (and it's not the "no group" or "add new" option)
      let groupRules: string | undefined
      if (selectedGroupId && selectedGroupId !== '__none__' && selectedGroupId !== '__add_new__') {
        const group = await getPostGroup(selectedGroupId)
        if (group) {
          groupRules = group.rules
        }
      }
      
      const generatedDesc = await generatePostDescription(selectedItems, groupRules)
      setDescription(generatedDesc)
    } catch (error) {
      console.error('Failed to generate description:', error)
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const handleCreateCollage = async () => {
    const selectedImageUrls = allImages
      .filter(img => selectedImages.has(img.id))
      .map(img => img.url)

    setIsCreatingCollage(true)
    try {
      const blob = await createCollage(selectedImageUrls)
      const url = URL.createObjectURL(blob)
      setCollageUrl(url)
      setCollageBlob(blob)
    } catch (error) {
      console.error('Failed to create collage:', error)
    } finally {
      setIsCreatingCollage(false)
    }
  }

  const handleSavePost = async () => {
    setIsSaving(true)
    setSaveError('')
    try {
      let uploadedCollageUrl: string | undefined

      // Upload collage if exists
      if (collageBlob) {
        uploadedCollageUrl = await uploadCollage(collageBlob)
      }

      // Save post to database
      const itemIds = Array.from(selectedItemIds)
      const normalizedDescription = description || null
      const nextCollageUrl = uploadedCollageUrl ?? collageUrl ?? null

      const savedPost = currentSavedPostId
        ? await updatePost(currentSavedPostId, {
          itemIds,
          description: normalizedDescription,
          collageUrl: nextCollageUrl,
        })
        : await savePost(itemIds, normalizedDescription || undefined, nextCollageUrl || undefined)

      // Keep local state in sync with saved values
      setCollageUrl(savedPost.collage_url || null)
      setCurrentSavedPostId(savedPost.id)
      setInitialDescription(savedPost.description || '')
      setInitialCollageUrl(savedPost.collage_url || null)
      setInitialItemIds(savedPost.item_ids || [])

      setSavedPosts(prev => {
        const existingIndex = prev.findIndex(post => post.id === savedPost.id)
        if (existingIndex === -1) return [savedPost, ...prev]
        const updated = [...prev]
        updated[existingIndex] = savedPost
        return updated
      })
    } catch (error) {
      console.error('Failed to save post:', error)
      setSaveError(error instanceof Error ? error.message : 'Greška pri spremanju')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyDescription = async () => {
    if (!description) return
    try {
      await copyToClipboard(description)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handlePublish = async () => {
    // Store the item IDs being published
    publishedItemIds.current = Array.from(selectedItemIds)
    waitingForFbReturn.current = true

    // Copy description to clipboard if exists
    if (description) {
      try {
        await copyToClipboard(description)
        setCopiedToClipboard(true)
        setTimeout(() => setCopiedToClipboard(false), 2000)
      } catch (error) {
        console.error('Failed to copy description:', error)
      }
    }

    if (isNative()) {
      try {
        // Collect all images to save: collage + all selected item images
        const imagesToSave: string[] = []

        // Add collage first if exists
        if (collageUrl) {
          imagesToSave.push(collageUrl)
        }

        // Add all images from selected items
        for (const item of selectedItems) {
          imagesToSave.push(...item.images)
        }

        console.log('[PUBLISH] Images to save:', imagesToSave.length)

        // Save all images to gallery (will appear as recent)
        if (imagesToSave.length > 0) {
          await saveImagesToGallery(imagesToSave)
          console.log('[PUBLISH] Images saved successfully')
        }

        // Open Facebook directly
        await openFacebook()
      } catch (error) {
        console.error('[PUBLISH] Error preparing for Facebook:', error)
        alert('Greška pri spremanju slika: ' + (error instanceof Error ? error.message : String(error)))
        // Still try to open Facebook
        await openFacebook()
      }
    } else {
      // On web, open Facebook in a new tab
      window.open('https://www.facebook.com/', '_blank')
    }
  }

  const handleConfirmPublished = () => {
    // Use the selected group name as the Facebook page name
    let pageName = ''
    if (selectedGroupId && selectedGroupId !== '__none__') {
      const selectedGroup = postGroups.find(g => g.id === selectedGroupId)
      if (selectedGroup) {
        pageName = selectedGroup.name
      }
    }
    
    if (pageName) {
      // Record publication with the group name as the page
      void handleRecordPublicationWithPage(pageName)
    } else {
      // If no group was selected, just close the dialog without recording
      setShowPublishConfirm(false)
      publishedItemIds.current = []
      currentPostId.current = null
    }
  }

  const handleRecordPublicationWithPage = async (pageName: string) => {
    setIsRecordingPublication(true)
    try {
      // First, save the post (like clicking the save button)
      let postId = currentSavedPostId
      if (!postId) {
        // If not already saved, save it now
        let uploadedCollageUrl: string | undefined
        if (collageBlob) {
          uploadedCollageUrl = await uploadCollage(collageBlob)
        }
        
        const itemIds = Array.from(selectedItemIds)
        const normalizedDescription = description || null
        const nextCollageUrl = uploadedCollageUrl ?? collageUrl ?? null
        
        const savedPost = await savePost(itemIds, normalizedDescription || undefined, nextCollageUrl || undefined)
        
        // Update local state
        setCollageUrl(savedPost.collage_url || null)
        setCurrentSavedPostId(savedPost.id)
        setInitialDescription(savedPost.description || '')
        setInitialCollageUrl(savedPost.collage_url || null)
        setInitialItemIds(savedPost.item_ids || [])
        
        setSavedPosts(prev => [savedPost, ...prev])
        postId = savedPost.id
      }
      
      // Now create the publication record
      await createPublication(
        publishedItemIds.current,
        pageName,
        postId || undefined,
        description || undefined,
        collageUrl || undefined
      )

      // Add new page to known pages if it's not already there
      if (!knownFbPages.includes(pageName)) {
        setKnownFbPages(prev => [...prev, pageName])
      }
      setShowPublishConfirm(false)
      publishedItemIds.current = []
      currentPostId.current = null

      // Show cleanup prompt on native if images were saved
      if (isNative()) {
        const count = getLastSavedImagesCount()
        if (count > 0) {
          setSavedImagesCount(count)
          setShowCleanupPrompt(true)
        }
      }
    } catch (error) {
      console.error('Failed to record publication:', error)
    } finally {
      setIsRecordingPublication(false)
    }
  }

  const handleCancelPublishConfirm = () => {
    setShowPublishConfirm(false)
    publishedItemIds.current = []
    currentPostId.current = null
  }

  const handleDeleteGalleryImages = async () => {
    setIsDeletingImages(true)
    try {
      const result = await deleteLastSavedImages()
      console.log(`Deleted ${result.deleted} images, ${result.failed} failed`)

      // If some deletions failed, inform the user
      if (result.failed > 0 && result.deleted === 0) {
        // All deletions failed - likely Android permission issue
        alert('Slike nije moguće automatski obrisati. Molimo obriši ih ručno iz galerije.')
      }
    } catch (error) {
      console.error('Error deleting images:', error)
      alert('Greška pri brisanju slika. Molimo obriši ih ručno iz galerije.')
    } finally {
      setIsDeletingImages(false)
      setShowCleanupPrompt(false)
      setSavedImagesCount(0)
    }
  }

  const handleLoadSavedPost = (post: Post) => {
    // Select the items from the saved post
    setSelectedItemIds(new Set(post.item_ids))
    setInitialItemIds(post.item_ids || [])
    setCurrentSavedPostId(post.id)

    // Load description
    setDescription(post.description || '')
    setInitialDescription(post.description || '')

    // Load collage URL if exists
    if (post.collage_url) {
      setCollageUrl(post.collage_url)
      setInitialCollageUrl(post.collage_url)
    } else {
      setCollageUrl(null)
      setInitialCollageUrl(null)
    }

    // Clear collage blob since we're loading from URL
    setCollageBlob(null)
    setSelectedImages(new Set())

    // Hide saved posts section
    setShowSavedPosts(false)
    setSaveError('')
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Pripremi post</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* Saved Posts Section */}
        {savedPosts.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowSavedPosts(!showSavedPosts)}
              className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium">
                Spremljeni postovi ({savedPosts.length})
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${showSavedPosts ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSavedPosts && (
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {savedPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => handleLoadSavedPost(post)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    {post.collage_url ? (
                      <img
                        src={post.collage_url}
                        alt="Kolaž"
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{post.item_ids.length}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {post.description || `${post.item_ids.length} artikala`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString('hr-HR')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Item Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Odaberi artikle ({selectedItemIds.size} odabrano)
          </label>
          {isLoadingItems ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : allItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nema artikala u Komodusu
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {allItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleItemSelection(item.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedItemIds.has(item.id)
                      ? 'border-primary'
                      : 'border-transparent'
                  }`}
                >
                  {item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      ?
                    </div>
                  )}
                  <div
                    className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      selectedItemIds.has(item.id)
                        ? 'bg-primary'
                        : 'bg-black/40'
                    }`}
                  >
                    {selectedItemIds.has(item.id) ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border-2 border-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedItems.length > 0 && (
          <>
            {/* Group Selection */}
            <div className="border border-border rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">
                Grupa za objavu (opcionalno)
              </label>
              <Select 
                value={selectedGroupId === '__add_new__' ? '__none__' : selectedGroupId} 
                onValueChange={(value) => {
                  if (value === '__add_new__') {
                    setIsGroupSettingsOpen(true)
                  } else {
                    setSelectedGroupId(value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Odaberite grupu..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez grupe</SelectItem>
                  {postGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-primary font-medium">
                    + Dodaj novu grupu
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedGroupId && selectedGroupId !== '__none__' && selectedGroupId !== '__add_new__' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Pravila grupe će se koristiti pri generiranju opisa
                </p>
              )}
            </div>

            {/* Description Section */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Opis posta</label>
                <div className="flex items-center gap-2">
                  {description && (
                    <button
                      onClick={handleCopyDescription}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedToClipboard ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500">Kopirano</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Kopiraj
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription}
                    className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 disabled:opacity-50"
                  >
                    {isGeneratingDescription ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generiraj s AI
                  </button>
                </div>
              </div>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setCopiedToClipboard(false)
                }}
                placeholder="Napiši opis za post ili generiraj pomoću AI..."
                className="w-full h-24 px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground"
              />
            </div>

            {/* Collage Section */}
            <div className="border border-border rounded-lg p-4">
              <label className="block text-sm font-medium mb-3">
                Kolaž slika ({selectedImages.size} odabrano)
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Odaberi slike za kolaž (opcionalno)
              </p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {allImages.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => toggleImage(image.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedImages.has(image.id)
                        ? 'border-primary'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.itemTitle}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        selectedImages.has(image.id)
                          ? 'bg-primary'
                          : 'bg-black/40'
                      }`}
                    >
                      {selectedImages.has(image.id) ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border-2 border-white" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedImages.size > 0 && (
                <button
                  onClick={handleCreateCollage}
                  disabled={isCreatingCollage}
                  className="w-full py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingCollage ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Kreiranje...
                    </>
                  ) : collageUrl ? (
                    'Ponovo kreiraj kolaž'
                  ) : (
                    'Kreiraj kolaž'
                  )}
                </button>
              )}

              {/* Collage Preview */}
              {collageUrl && (
                <div className="mt-4">
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={collageUrl}
                      alt="Kolaž"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Bottom Buttons */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          {saveError && (
            <p className="text-sm text-red-500 text-center mb-2">{saveError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSavePost}
              disabled={isSaving || (showSavedState && currentSavedPostId !== null)}
              className="flex-1 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : showSavedState ? (
                <>
                  <Check className="w-5 h-5" />
                  Spremljeno
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Spremi
                </>
              )}
            </button>
            <button
              onClick={handlePublish}
              className="flex-1 py-3 bg-[#1877F2] text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Objavi na FB
            </button>
          </div>
        </div>
      )}

      {/* Publish Confirmation Popup */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 mx-4 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-bold text-center mb-2">
              Uspješno objavljeno?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Jesi li objavio/la post na Facebook?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelPublishConfirm}
                disabled={isRecordingPublication}
                className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Ne
              </button>
              <button
                onClick={handleConfirmPublished}
                disabled={isRecordingPublication}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRecordingPublication ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  'Da'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Prompt */}
      {showCleanupPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 mx-4 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-bold text-center mb-2">
              Objava spremljena!
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-2">
              {savedImagesCount} {savedImagesCount === 1 ? 'slika je spremljena' : 'slike su spremljene'} u galeriju.
            </p>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Želiš li ih obrisati iz galerije? Slike ostaju dostupne u aplikaciji i možeš ih ponovo skinuti kad god trebaš.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCleanupPrompt(false)
                  setSavedImagesCount(0)
                }}
                disabled={isDeletingImages}
                className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Zadrži slike
              </button>
              <button
                onClick={handleDeleteGalleryImages}
                disabled={isDeletingImages}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingImages ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  'Obriši slike'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Dialog */}
      <CategorySettingsDialog
        open={isGroupSettingsOpen}
        onOpenChange={setIsGroupSettingsOpen}
        initialTab="groups"
        onGroupCreated={handleGroupCreated}
        onCategoriesUpdated={() => {}}
      />
    </div>
  )
}
