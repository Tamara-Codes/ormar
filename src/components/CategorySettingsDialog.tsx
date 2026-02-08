import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { deleteCustomCategory, getCustomCategories, updateCustomCategory } from '../lib/categories'
import type { CustomCategory } from '../lib/categories'
import { getPostGroups, createPostGroup, updatePostGroup, deletePostGroup } from '../lib/postGroups'
import type { PostGroup } from '../lib/postGroups'
import { AddCategoryDialog } from './AddCategoryDialog'

interface CategorySettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoriesUpdated: () => void
  initialTab?: Tab
  onGroupCreated?: (groupId: string) => void
}

type Tab = 'categories' | 'groups'

export function CategorySettingsDialog({
  open,
  onOpenChange,
  onCategoriesUpdated,
  initialTab = 'categories',
  onGroupCreated,
}: CategorySettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('categories')
  
  // Set active tab when dialog opens with initialTab
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])
  
  // Categories state
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  
  // Post Groups state
  const [postGroups, setPostGroups] = useState<PostGroup[]>([])
  const [isGroupsLoading, setIsGroupsLoading] = useState(false)
  const [groupSavingId, setGroupSavingId] = useState<string | null>(null)
  const [groupDeletingId, setGroupDeletingId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [draftGroupName, setDraftGroupName] = useState('')
  const [draftGroupRules, setDraftGroupRules] = useState('')
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null)
  const [groupError, setGroupError] = useState('')

  useEffect(() => {
    if (!open) return
    void loadCategories()
    void loadPostGroups()
  }, [open])

  const loadCategories = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getCustomCategories()
      setCategories(data)
      if (editingId && !data.some((cat) => cat.id === editingId)) {
        setEditingId(null)
        setDraftName('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju kategorija')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartEdit = (category: CustomCategory) => {
    setEditingId(category.id)
    setDraftName(category.name)
    setError('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setDraftName('')
    setError('')
  }

  const handleSave = async (categoryId: string) => {
    const nextName = draftName.trim()
    if (!nextName) {
      setError('Unesite ime kategorije')
      return
    }

    setSavingId(categoryId)
    setError('')
    try {
      const updated = await updateCustomCategory(categoryId, nextName)
      setCategories((prev) => prev.map((cat) => (cat.id === categoryId ? updated : cat)))
      onCategoriesUpdated()
      setEditingId(null)
      setDraftName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri spremanju kategorije')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (categoryId: string) => {
    setDeletingId(categoryId)
    setError('')
    try {
      await deleteCustomCategory(categoryId)
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))
      if (editingId === categoryId) {
        setEditingId(null)
        setDraftName('')
      }
      if (confirmDeleteId === categoryId) {
        setConfirmDeleteId(null)
      }
      onCategoriesUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri brisanju kategorije')
    } finally {
      setDeletingId(null)
    }
  }

  // Post Groups functions
  const loadPostGroups = async () => {
    setIsGroupsLoading(true)
    setGroupError('')
    try {
      const data = await getPostGroups()
      setPostGroups(data)
      if (editingGroupId && !data.some((group) => group.id === editingGroupId)) {
        setEditingGroupId(null)
        setDraftGroupName('')
        setDraftGroupRules('')
      }
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Greška pri učitavanju grupa')
    } finally {
      setIsGroupsLoading(false)
    }
  }

  const handleStartCreateGroup = () => {
    setCreatingGroup(true)
    setDraftGroupName('')
    setDraftGroupRules('')
    setGroupError('')
  }

  const handleCancelCreateGroup = () => {
    setCreatingGroup(false)
    setDraftGroupName('')
    setDraftGroupRules('')
    setGroupError('')
  }

  const handleCreateGroup = async () => {
    const name = draftGroupName.trim()
    const rules = draftGroupRules.trim()
    
    if (!name) {
      setGroupError('Unesite ime grupe')
      return
    }
    
    if (!rules) {
      setGroupError('Unesite pravila za grupu')
      return
    }

    setGroupSavingId('new')
    setGroupError('')
    try {
      const newGroup = await createPostGroup(name, rules)
      setPostGroups((prev) => [...prev, newGroup])
      setCreatingGroup(false)
      setDraftGroupName('')
      setDraftGroupRules('')
      
      // Notify parent component about the new group
      if (onGroupCreated) {
        onGroupCreated(newGroup.id)
      }
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Greška pri kreiranju grupe')
    } finally {
      setGroupSavingId(null)
    }
  }

  const handleStartEditGroup = (group: PostGroup) => {
    setEditingGroupId(group.id)
    setDraftGroupName(group.name)
    setDraftGroupRules(group.rules)
    setGroupError('')
  }

  const handleCancelEditGroup = () => {
    setEditingGroupId(null)
    setDraftGroupName('')
    setDraftGroupRules('')
    setGroupError('')
  }

  const handleSaveGroup = async (groupId: string) => {
    const name = draftGroupName.trim()
    const rules = draftGroupRules.trim()
    
    if (!name) {
      setGroupError('Unesite ime grupe')
      return
    }
    
    if (!rules) {
      setGroupError('Unesite pravila za grupu')
      return
    }

    setGroupSavingId(groupId)
    setGroupError('')
    try {
      const updated = await updatePostGroup(groupId, name, rules)
      setPostGroups((prev) => prev.map((group) => (group.id === groupId ? updated : group)))
      setEditingGroupId(null)
      setDraftGroupName('')
      setDraftGroupRules('')
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Greška pri spremanju grupe')
    } finally {
      setGroupSavingId(null)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    setGroupDeletingId(groupId)
    setGroupError('')
    try {
      await deletePostGroup(groupId)
      setPostGroups((prev) => prev.filter((group) => group.id !== groupId))
      if (editingGroupId === groupId) {
        setEditingGroupId(null)
        setDraftGroupName('')
        setDraftGroupRules('')
      }
      if (confirmDeleteGroupId === groupId) {
        setConfirmDeleteGroupId(null)
      }
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Greška pri brisanju grupe')
    } finally {
      setGroupDeletingId(null)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Postavke</DialogTitle>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Kategorije
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Grupe za objave
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {activeTab === 'categories' && (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <Button onClick={() => setIsAddCategoryDialogOpen(true)} size="sm">
                  + Dodaj novu kategoriju
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 rounded-md bg-muted animate-pulse" />
                  <div className="h-10 rounded-md bg-muted animate-pulse" />
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => {
                    const isSaving = savingId === category.id
                    const isDeleting = deletingId === category.id
                    const isBusy = isSaving || isDeleting
                    const isEditing = editingId === category.id
                    const isUnchanged = draftName.trim() === category.name.trim()
                    const isConfirmingDelete = confirmDeleteId === category.id

                    return (
                      <div key={category.id} className="rounded-lg border border-border bg-card px-3 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{category.name}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(category)}
                              disabled={isBusy || isEditing}
                            >
                              Uredi
                            </Button>
                            <Button size="sm" onClick={() => setConfirmDeleteId(category.id)} disabled={isBusy}>
                              Obriši
                            </Button>
                          </div>
                        </div>
                        {isConfirmingDelete && (
                          <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                            <p className="mb-2">Obrisati kategoriju "{category.name}"?</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isBusy}
                              >
                                Odustani
                              </Button>
                              <Button size="sm" onClick={() => handleDelete(category.id)} disabled={isBusy}>
                                {isDeleting ? 'Brisanje...' : 'Potvrdi brisanje'}
                              </Button>
                            </div>
                          </div>
                        )}
                        {isEditing && (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              value={draftName}
                              onChange={(e) => {
                                setDraftName(e.target.value)
                                setError('')
                              }}
                              disabled={isBusy}
                              className="flex-1"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isBusy}
                              >
                                Odustani
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSave(category.id)}
                                disabled={isBusy || !draftName.trim() || isUnchanged}
                              >
                                {isSaving ? 'Spremanje...' : 'Spremi'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'groups' && (
            <>
              {groupError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {groupError}
                </div>
              )}
              
              {!creatingGroup && (
                <div className="mb-4">
                  <Button onClick={handleStartCreateGroup} size="sm">
                    + Dodaj novu grupu
                  </Button>
                </div>
              )}

              {creatingGroup && (
                <div className="rounded-lg border border-border bg-card px-4 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Ime grupe</label>
                    <Input
                      value={draftGroupName}
                      onChange={(e) => {
                        setDraftGroupName(e.target.value)
                        setGroupError('')
                      }}
                      placeholder="Npr. Facebook grupa za odjeću"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Pravila za kreiranje opisa
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Kopirajte pravila iz Facebook grupe. AI će kreirati opise koji poštuju ta pravila.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('https://www.facebook.com/groups/feed/', '_blank')}
                      className="mb-3 w-full sm:w-auto"
                    >
                      <span className="text-lg mr-1">🫂</span> Otvori Facebook Grupe
                    </Button>
                    <textarea
                      value={draftGroupRules}
                      onChange={(e) => {
                        setDraftGroupRules(e.target.value)
                        setGroupError('')
                      }}
                      placeholder={`Primjer pravila za grupu:

1. Opis mora biti kratak i jasan (2-3 rečenice)
2. Obavezno navesti: brend, veličinu, stanje, cijenu
3. Zabranjeno:
   - Vulgarne riječi
   - Caps Lock
   - Prekomjerno korištenje emoji-a
4. Dodati poziv na akciju (npr. "Pošalji poruku za detalje")
5. Uključiti relevantne hashtag-ove (#odjeća #prodaja)

Kopirajte stvarna pravila iz Facebook grupe u koju objavljujete.`}
                      className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground min-h-[200px] text-sm"
                      rows={12}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelCreateGroup}
                      disabled={groupSavingId === 'new'}
                      className="flex-1 sm:flex-initial"
                    >
                      Odustani
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateGroup}
                      disabled={groupSavingId === 'new' || !draftGroupName.trim() || !draftGroupRules.trim()}
                      className="flex-1 sm:flex-initial"
                    >
                      {groupSavingId === 'new' ? 'Spremanje...' : 'Spremi'}
                    </Button>
                  </div>
                </div>
              )}

              {!creatingGroup && isGroupsLoading ? (
                <div className="space-y-3">
                  <div className="h-20 rounded-md bg-muted animate-pulse" />
                  <div className="h-20 rounded-md bg-muted animate-pulse" />
                </div>
              ) : !creatingGroup ? (
                <div className="space-y-3">
                  {postGroups.map((group) => {
                    const isSaving = groupSavingId === group.id
                    const isDeleting = groupDeletingId === group.id
                    const isBusy = isSaving || isDeleting
                    const isEditing = editingGroupId === group.id
                    const isUnchanged = 
                      draftGroupName.trim() === group.name.trim() && 
                      draftGroupRules.trim() === group.rules.trim()
                    const isConfirmingDelete = confirmDeleteGroupId === group.id

                    return (
                      <div key={group.id} className="rounded-lg border border-border bg-card px-3 py-3">
                        {!isEditing && (
                          <>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground mb-1">{group.name}</p>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{group.rules}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartEditGroup(group)}
                                  disabled={isBusy}
                                >
                                  Uredi
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => setConfirmDeleteGroupId(group.id)} 
                                  disabled={isBusy}
                                >
                                  Obriši
                                </Button>
                              </div>
                            </div>
                            {isConfirmingDelete && (
                              <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                                <p className="mb-2">Obrisati grupu "{group.name}"?</p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmDeleteGroupId(null)}
                                    disabled={isBusy}
                                  >
                                    Odustani
                                  </Button>
                                  <Button size="sm" onClick={() => handleDeleteGroup(group.id)} disabled={isBusy}>
                                    {isDeleting ? 'Brisanje...' : 'Potvrdi brisanje'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {isEditing && (
                          <div className="space-y-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-foreground">Ime grupe</label>
                              <Input
                                value={draftGroupName}
                                onChange={(e) => {
                                  setDraftGroupName(e.target.value)
                                  setGroupError('')
                                }}
                                disabled={isBusy}
                                className="w-full"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2 text-foreground">
                                Pravila za kreiranje opisa
                              </label>
                              <p className="text-xs text-muted-foreground mb-3">
                                Kopirajte pravila iz Facebook grupe. AI će kreirati opise koji poštuju ta pravila.
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => window.open('https://www.facebook.com/groups/feed/', '_blank')}
                                className="mb-3 w-full sm:w-auto"
                                disabled={isBusy}
                              >
                                <span className="text-lg mr-1">🫂</span> Otvori Facebook Grupe
                              </Button>
                              <textarea
                                value={draftGroupRules}
                                onChange={(e) => {
                                  setDraftGroupRules(e.target.value)
                                  setGroupError('')
                                }}
                                disabled={isBusy}
                                placeholder={`Primjer pravila za grupu:

1. Opis mora biti kratak i jasan (2-3 rečenice)
2. Obavezno navesti: brend, veličinu, stanje, cijenu
3. Zabranjeno:
   - Vulgarne riječi
   - Caps Lock
   - Prekomjerno korištenje emoji-a
4. Dodati poziv na akciju (npr. "Pošalji poruku za detalje")
5. Uključiti relevantne hashtag-ove (#odjeća #prodaja)

Kopirajte stvarna pravila iz Facebook grupe u koju objavljujete.`}
                                className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground min-h-[200px] text-sm"
                                rows={12}
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditGroup}
                                disabled={isBusy}
                                className="flex-1 sm:flex-initial"
                              >
                                Odustani
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveGroup(group.id)}
                                disabled={isBusy || !draftGroupName.trim() || !draftGroupRules.trim() || isUnchanged}
                                className="flex-1 sm:flex-initial"
                              >
                                {isSaving ? 'Spremanje...' : 'Spremi'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {postGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nema kreiranih grupa. Kliknite "Dodaj novu grupu" da kreirate prvu.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    <AddCategoryDialog
      open={isAddCategoryDialogOpen}
      onOpenChange={setIsAddCategoryDialogOpen}
      onCategoryAdded={() => {
        void loadCategories()
        onCategoriesUpdated()
      }}
    />
  </>
  )
}

