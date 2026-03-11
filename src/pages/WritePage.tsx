import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { createEntry, updateEntry, getEntry } from '@/services/firebase/entries'
import { Editor } from '@/components/editor/Editor'
import { MetaPanel } from '@/components/editor/MetaPanel'
import type { MoodType } from '@/types/entry'
import { useBookmark } from '@/hooks/useBookmark'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const WritePage = () => {
    const { entryId } = useParams<{ entryId?: string }>()
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [docId, setDocId] = useState<string | null>(entryId ?? null)
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [bodyText, setBodyText] = useState('')
    const [moods, setMoods] = useState<MoodType[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [wordCount, setWordCount] = useState(0)
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
    const [initialized, setInitialized] = useState(false)
    const [metaOpen, setMetaOpen] = useState(false)
    const { isBookmarked, toggle: toggleBookmark } = useBookmark(entryId)

    // Load existing entry
    useEffect(() => {
        if (!entryId || !user) { setInitialized(true); return }
        const load = async () => {
            const entry = await getEntry(user.uid, entryId)
            if (entry) {
                setTitle(entry.title)
                setBody(entry.body)
                setBodyText(entry.bodyText)
                // Support both old single mood and new multiple moods
                setMoods(entry.moods ?? [])
                setTags(entry.tags)
                setWordCount(entry.wordCount)
                setDocId(entryId)
            }
            setInitialized(true)
        }
        load()
    }, [entryId, user])

    // Core save function
    const save = useCallback(async (
        newTitle: string, newBody: string, newBodyText: string,
        newMoods: MoodType[], newTags: string[],
        newWc: number, currentDocId: string | null,
    ) => {
        if (!user) return
        setSaveStatus('saving')
        try {
            const data = {
                title: newTitle, body: newBody, bodyText: newBodyText,
                moods: newMoods,
                // Keep legacy mood field as first mood for backwards compat
                mood: newMoods[0] ?? null,
                tags: newTags, wordCount: newWc,
                status: 'published' as const,
            }
            if (currentDocId) {
                await updateEntry(user.uid, currentDocId, data)
            } else {
                const id = await createEntry(user.uid)
                await updateEntry(user.uid, id, data)
                setDocId(id)
                window.history.replaceState(null, '', `/write/${id}`)
            }
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
            setSaveStatus('error')
        }
    }, [user])

    // Debounced auto-save
    const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
    const scheduleAutoSave = useCallback((
        t: string, b: string, bt: string,
        m: MoodType[], tg: string[], wc: number, id: string | null,
    ) => {
        if (saveTimer) clearTimeout(saveTimer)
        const timer = setTimeout(() => save(t, b, bt, m, tg, wc, id), 2000)
        setSaveTimer(timer)
    }, [save, saveTimer])

    const handleTitleChange = (v: string) => {
        setTitle(v)
        scheduleAutoSave(v, body, bodyText, moods, tags, wordCount, docId)
    }
    const handleBodyChange = (html: string, text: string, wc: number) => {
        setBody(html); setBodyText(text); setWordCount(wc)
        scheduleAutoSave(title, html, text, moods, tags, wc, docId)
    }
    const handleMoodsChange = (newMoods: MoodType[]) => {
        setMoods(newMoods)
        scheduleAutoSave(title, body, bodyText, newMoods, tags, wordCount, docId)
    }
    const handleTagsChange = (newTags: string[]) => {
        setTags(newTags)
        scheduleAutoSave(title, body, bodyText, moods, newTags, wordCount, docId)
    }

    // Manual save handler
    const handleManualSave = () => {
        save(title, body, bodyText, moods, tags, wordCount, docId)
    }

    // Ctrl+S
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                save(title, body, bodyText, moods, tags, wordCount, docId)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [title, body, bodyText, moods, tags, wordCount, docId, save])

    if (!initialized) {
        return (
            <div className="flex items-center justify-center h-full text-muted text-sm">
                Loading...
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">

            {/* ── TOP BAR ── */}
            <div className="flex items-center justify-between px-4 py-2.5
                      border-b border-border bg-card shrink-0 gap-2">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1 text-xs text-muted
                     hover:text-ink transition-colors shrink-0"
                >
                    ← <span className="hidden sm:inline">Dashboard</span>
                </button>

                {/* Save status indicator */}
                <span className={`text-[11px] transition-all ${saveStatus === 'saving' ? 'text-muted' :
                    saveStatus === 'saved' ? 'text-accent' :
                        saveStatus === 'error' ? 'text-terra' : 'text-transparent'
                    }`}>
                    {saveStatus === 'saving' ? 'Saving...' :
                        saveStatus === 'saved' ? '✓ Saved' :
                            saveStatus === 'error' ? 'Error saving' : '·'}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted hidden sm:inline">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    </span>
                    {/* Details toggle — prominent */}
                    <button
                        onClick={() => setMetaOpen(o => !o)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${metaOpen
                            ? 'border-accent bg-accent-pale text-accent'
                            : 'border-accent bg-accent text-white hover:opacity-90'
                            }`}
                    >
                        {metaOpen ? '← Hide' : '✦ Details'}
                    </button>
                    <button
                        onClick={toggleBookmark}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this entry'}
                        className={`p-2 rounded-xl border transition-colors ${isBookmarked
                            ? 'bg-gold/10 text-gold border-gold/30'
                            : 'border-border text-muted hover:text-ink'
                            }`}
                    >
                        {isBookmarked ? '◈' : '◇'}
                    </button>
                </div>
            </div>

            {/* ── SPLIT BODY ── */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* Editor */}
                <div className="flex-1 overflow-y-auto flex flex-col">
                    <div className="flex-1">
                        <Editor
                            title={title}
                            body={body}
                            onTitleChange={handleTitleChange}
                            onBodyChange={handleBodyChange}
                        />
                    </div>

                    {/* ── SAVE BUTTON — bottom of editor ── */}
                    <div className="px-4 sm:px-6 py-4 max-w-2xl mx-auto w-full">
                        <button
                            onClick={handleManualSave}
                            disabled={saveStatus === 'saving'}
                            className="w-full py-3 bg-ink text-bg rounded-xl text-sm
                         font-medium hover:opacity-85 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
                        >
                            {saveStatus === 'saving' ? (
                                <>
                                    <span className="animate-pulse">●</span>
                                    Saving...
                                </>
                            ) : saveStatus === 'saved' ? (
                                <>✓ Saved</>
                            ) : (
                                <>Save Entry</>
                            )}
                        </button>
                        <p className="text-[10px] text-muted text-center mt-2">
                            Auto-saves every 2 seconds · Ctrl+S to save manually
                        </p>
                    </div>
                </div>

                {/* ── META PANEL ── */}
                {metaOpen && (
                    <>
                        {/* Mobile backdrop */}
                        <div
                            className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
                            onClick={() => setMetaOpen(false)}
                        />
                        {/* Panel — bottom sheet on mobile, side panel on desktop */}
                        <div className="
              fixed bottom-0 left-0 right-0 z-30
              max-h-[75vh] overflow-y-auto
              bg-card border-t border-border rounded-t-2xl shadow-xl
              lg:static lg:w-[300px] lg:max-h-none
              lg:border-t-0 lg:border-l lg:rounded-none lg:shadow-none lg:z-auto
            ">
                            {/* Mobile drag handle */}
                            <div className="flex justify-center pt-3 pb-1 lg:hidden">
                                <div className="w-8 h-1 bg-border rounded-full" />
                            </div>
                            <MetaPanel
                                moods={moods}
                                tags={tags}
                                wordCount={wordCount}
                                onMoodsChange={handleMoodsChange}
                                onTagsChange={handleTagsChange}
                            />
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}