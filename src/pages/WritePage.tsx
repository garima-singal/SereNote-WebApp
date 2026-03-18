import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { createEntry, updateEntry, getEntry } from '@/services/firebase/entries'
import { auth } from '@/services/firebase/config'
import { isOnline, savePendingEntry } from '@/services/offlineStorage'
import { getUserProfile } from '@/services/firebase/users'
import { useBookmark } from '@/hooks/useBookmark'
import { Editor } from '@/components/editor/Editor'
import { MetaPanel } from '@/components/editor/MetaPanel'
import { AIReflectionPanel } from '@/components/editor/AIReflectionPanel'
import type { MoodType } from '@/types/entry'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Word goal options
const WORD_GOALS = [0, 100, 200, 300, 500, 750, 1000]

export const WritePage = () => {
    const { entryId } = useParams<{ entryId?: string }>()
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Core entry state
    const [docId, setDocId] = useState<string | null>(entryId ?? null)
    // Pre-fill title from prompt query param if starting a new entry
    const promptFromUrl = searchParams.get('prompt') ?? ''
    const [title, setTitle] = useState(promptFromUrl)
    const [body, setBody] = useState('')
    const [bodyText, setBodyText] = useState('')
    const [moods, setMoods] = useState<MoodType[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [wordCount, setWordCount] = useState(0)

    // UI state
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
    const [metaOpen, setMetaOpen] = useState(true)
    const [focusMode, setFocusMode] = useState(false)
    const [wordGoal, setWordGoal] = useState(0)
    const [showGoalPick, setShowGoalPick] = useState(false)
    const [initialized, setInitialized] = useState(false)

    // AI state
    const [aiOptIn, setAiOptIn] = useState(false)
    const [panelWidth, setPanelWidth] = useState(280)
    const isResizing = React.useRef(false)

    const startResize = (e: React.MouseEvent) => {
        isResizing.current = true
        const startX = e.clientX
        const startWidth = panelWidth

        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return
            const delta = startX - e.clientX
            const newWidth = Math.min(480, Math.max(220, startWidth + delta))
            setPanelWidth(newWidth)
        }
        const onMouseUp = () => {
            isResizing.current = false
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }
    const [polishing, setPolishing] = useState(false)
    const [, setPolishChanges] = useState('')

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const editorRef = useRef<{ setContent: (html: string) => void } | null>(null)

    // Bookmark
    const { isBookmarked, toggle: toggleBookmark } = useBookmark(docId ?? '')

    // ── LOAD AI OPT-IN FROM USER SETTINGS ────────────────────
    useEffect(() => {
        if (!user) return
        getUserProfile(user.uid).then(profile => {
            setAiOptIn(profile?.settings?.aiOptIn ?? false)
        })
    }, [user])

    // ── LOAD EXISTING ENTRY ───────────────────────────────────
    useEffect(() => {
        if (!entryId || !user) { setInitialized(true); return }
        const load = async () => {
            const entry = await getEntry(user.uid, entryId)
            if (entry) {
                setTitle(entry.title)
                setBody(entry.body)
                setBodyText(entry.bodyText)
                setMoods(entry.moods ?? [])
                setTags(entry.tags)
                setWordCount(entry.wordCount)
                setDocId(entryId)
            }
            setInitialized(true)
        }
        load()
    }, [entryId, user])

    // ── FOCUS MODE — Escape to exit ───────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && focusMode) setFocusMode(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [focusMode])

    // ── SAVE ──────────────────────────────────────────────────
    const save = useCallback(async (
        t: string, b: string, bt: string,
        m: MoodType[], tg: string[], wc: number,
        id: string | null,
        isManual = false,
    ) => {
        if (!user) return
        setSaveStatus('saving')
        try {
            const data = {
                title: t, body: b, bodyText: bt,
                moods: m, tags: tg, wordCount: wc,
                status: 'published' as const,
            }
            if (id) {
                await updateEntry(user.uid, id, data)
            } else {
                const newId = await createEntry(user.uid)
                await updateEntry(user.uid, newId, data)
                setDocId(newId)
                window.history.replaceState(null, '', `/write/${newId}`)
            }
            const savedId = id ?? docId
            setSaveStatus('saved')
            // Embed for RAG — fire and forget
            if (savedId) embedEntry(savedId)
            if (isManual) {
                toast.success('Entry saved!')
                setTimeout(() => navigate('/timeline'), 500)
            } else {
                setTimeout(() => setSaveStatus('idle'), 2000)
            }
        } catch (err) {
            // If offline, save to IndexedDB for later sync
            if (!isOnline()) {
                try {
                    const localId = id ?? `offline-${Date.now()}`
                    await savePendingEntry({
                        id: localId,
                        uid: user.uid,
                        title: t,
                        body: b,
                        bodyText: bt,
                        moods: m,
                        tags: tg,
                        wordCount: wc,
                        isNew: !id,
                        savedAt: Date.now(),
                    })
                    if (!docId) setDocId(localId)
                    setSaveStatus('saved')
                    // Notify OfflineBanner about pending entry
                    window.dispatchEvent(new Event('serenote:pending-update'))
                    if (isManual) {
                        toast.warning('Saved locally — will sync when online')
                        setTimeout(() => navigate('/timeline'), 500)
                    } else {
                        setTimeout(() => setSaveStatus('idle'), 2000)
                    }
                } catch {
                    setSaveStatus('error')
                    toast.error('Failed to save entry.')
                }
            } else {
                setSaveStatus('error')
                toast.error('Failed to save entry.')
            }
        }
    }, [user, navigate])

    // ── DEBOUNCED AUTOSAVE ────────────────────────────────────
    const scheduleAutoSave = useCallback((
        t: string, b: string, bt: string,
        m: MoodType[], tg: string[], wc: number,
        id: string | null,
    ) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            save(t, b, bt, m, tg, wc, id)
        }, 2000)
    }, [save])

    // ── POLISH ───────────────────────────────────────────────
    const handlePolish = async () => {
        if (!docId || !user || polishing) return
        setPolishing(true)
        setPolishChanges('')
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Not authenticated')
            const res = await fetch('/api/ai/polish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId: docId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Polish failed')
            // Update editor content directly via ref (avoids re-render/focus loss)
            setBody(data.polishedHtml)
            setBodyText(data.bodyText ?? bodyText)
            editorRef.current?.setContent(data.polishedHtml)
            setPolishChanges(data.changes ?? '')
            toast.success('✦ Entry polished!')
        } catch (e: any) {
            toast.error(e.message ?? 'Polish failed')
        } finally {
            setPolishing(false)
        }
    }

    // ── EMBED (fire-and-forget after save) ──────────────────
    const embedEntry = async (entryId: string) => {
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return
            // Fire and forget — don't await, don't show errors to user
            fetch('/api/ai/embed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId }),
            })
        } catch {
            // Silently ignore — RAG will fall back to Firestore if this fails
        }
    }

    // ── HANDLERS ─────────────────────────────────────────────
    const handleTitleChange = (v: string) => {
        setTitle(v)
        scheduleAutoSave(v, body, bodyText, moods, tags, wordCount, docId)
    }

    const handleBodyChange = (b: string, bt: string, wc: number) => {
        setBody(b); setBodyText(bt); setWordCount(wc)
        scheduleAutoSave(title, b, bt, moods, tags, wc, docId)
    }

    const handleMoodsChange = (m: MoodType[]) => {
        setMoods(m)
        scheduleAutoSave(title, body, bodyText, m, tags, wordCount, docId)
    }

    const handleTagsChange = (tg: string[]) => {
        setTags(tg)
        scheduleAutoSave(title, body, bodyText, moods, tg, wordCount, docId)
    }

    // ── Ctrl+S ────────────────────────────────────────────────
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

    // ── WORD GOAL PROGRESS ────────────────────────────────────
    const goalProgress = wordGoal > 0
        ? Math.min(100, Math.round((wordCount / wordGoal) * 100))
        : 0
    const goalReached = wordGoal > 0 && wordCount >= wordGoal

    // Notify when goal is first reached
    const prevGoalReached = useRef(false)
    useEffect(() => {
        if (goalReached && !prevGoalReached.current) {
            toast.success(`🎉 Goal reached! ${wordGoal} words written.`)
        }
        prevGoalReached.current = goalReached
    }, [goalReached, wordGoal])

    if (!initialized) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent
                          rounded-full animate-spin" />
                    <span className="text-xs text-muted">Loading entry…</span>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-col h-full transition-colors duration-300
                     ${focusMode ? 'bg-[#FDFAF6]' : 'bg-bg'}`}>

            {/* ── TOP BAR ── */}
            {!focusMode && (
                <div className="flex items-center justify-between px-4 sm:px-5 py-3
                        border-b border-border bg-card shrink-0 gap-3">

                    {/* Left — back */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-1.5 text-xs text-muted
                       hover:text-ink transition-colors shrink-0"
                    >
                        ← Dashboard
                    </button>

                    {/* Right — controls */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">

                        {/* Word count + goal */}
                        <div className="relative">
                            <button
                                onClick={() => setShowGoalPick(v => !v)}
                                title="Set word goal"
                                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${wordGoal > 0
                                    ? goalReached
                                        ? 'border-accent bg-accent-pale text-accent'
                                        : 'border-gold/40 bg-gold/10 text-gold'
                                    : 'border-transparent text-muted hover:text-ink'
                                    }`}
                            >
                                {wordCount} {wordCount === 1 ? 'word' : 'words'}
                                {wordGoal > 0 && ` / ${wordGoal}`}
                            </button>

                            {/* Goal picker dropdown */}
                            {showGoalPick && (
                                <div className="absolute top-full right-0 mt-1 z-50 bg-card
                                border border-border rounded-xl shadow-lg p-2
                                min-w-[130px]">
                                    <div className="text-[10px] font-semibold text-muted uppercase
                                  tracking-wider mb-1.5 px-1">Word goal</div>
                                    {WORD_GOALS.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => { setWordGoal(g); setShowGoalPick(false) }}
                                            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs
                                  transition-colors ${wordGoal === g
                                                    ? 'bg-accent-pale text-accent font-medium'
                                                    : 'text-ink hover:bg-surface'
                                                }`}
                                        >
                                            {g === 0 ? 'No goal' : `${g} words`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bookmark */}
                        {docId && (
                            <button
                                onClick={toggleBookmark}
                                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                                className={`text-sm px-2 py-1 rounded-lg border transition-colors ${isBookmarked
                                    ? 'border-gold/40 bg-gold/10 text-gold'
                                    : 'border-border text-muted hover:text-ink'
                                    }`}
                            >
                                {isBookmarked ? '★' : '☆'}
                            </button>
                        )}

                        {/* Polish button — only when AI on + entry saved + has content */}
                        {aiOptIn && docId && wordCount >= 10 && (
                            <button
                                onClick={handlePolish}
                                disabled={polishing}
                                title="Polish grammar & clarity with AI"
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5
                                           rounded-lg border border-lav/40 text-lav
                                           hover:bg-lav-pale transition-all
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {polishing ? (
                                    <>
                                        <span className="w-3 h-3 border border-lav
                                                         border-t-transparent rounded-full
                                                         animate-spin" />
                                        Polishing…
                                    </>
                                ) : (
                                    <>✦ Polish</>
                                )}
                            </button>
                        )}

                        {/* Save button */}
                        <button
                            onClick={() => save(title, body, bodyText, moods, tags, wordCount, docId, true)}
                            disabled={saveStatus === 'saving'}
                            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed ${saveStatus === 'saved'
                                    ? 'bg-accent-pale text-accent border border-accent'
                                    : saveStatus === 'error'
                                        ? 'bg-terra-pale text-terra border border-terra/30'
                                        : 'bg-ink text-bg hover:opacity-85 border border-ink'
                                }`}
                        >
                            {saveStatus === 'saving' ? 'Saving…' :
                                saveStatus === 'saved' ? '✓ Saved' :
                                    saveStatus === 'error' ? 'Error' : 'Save'}
                        </button>

                        {/* Meta panel toggle */}
                        <button
                            onClick={() => setMetaOpen(o => !o)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${metaOpen
                                ? 'border-accent bg-accent-pale text-accent'
                                : 'border-border text-muted hover:text-ink'
                                }`}
                        >
                            {metaOpen ? 'Hide details' : 'Details'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── WORD GOAL PROGRESS BAR ── */}
            {wordGoal > 0 && !focusMode && (
                <div className="h-0.5 bg-border shrink-0">
                    <div
                        className={`h-full transition-all duration-500 ${goalReached ? 'bg-accent' : 'bg-gold'
                            }`}
                        style={{ width: `${goalProgress}%` }}
                    />
                </div>
            )}

            {/* ── FOCUS MODE OVERLAY CONTROLS ── */}
            {focusMode && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
                    <span className="text-xs text-muted/60 bg-white/60 backdrop-blur-sm
                           px-2.5 py-1 rounded-lg">
                        {wordCount} words
                        {wordGoal > 0 && ` / ${wordGoal}`}
                    </span>
                    <button
                        onClick={() => setFocusMode(false)}
                        className="text-xs text-muted/60 bg-white/60 backdrop-blur-sm
                       hover:text-ink hover:bg-white/80 px-2.5 py-1
                       rounded-lg transition-all"
                    >
                        Esc · Exit focus
                    </button>
                </div>
            )}

            {/* ── SPLIT LAYOUT ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Editor */}
                <div className={`flex-1 overflow-y-auto transition-all duration-300
                         ${focusMode ? 'focus-mode' : ''}`}>
                    <Editor
                        title={title}
                        body={body}
                        focusMode={focusMode}
                        onTitleChange={handleTitleChange}
                        onBodyChange={handleBodyChange}
                        onReady={(api) => { editorRef.current = api }}
                    />
                </div>

                {/* Meta panel — desktop, hidden in focus mode */}
                {metaOpen && !focusMode && (
                    <div
                        className="shrink-0 border-l border-border
                                   overflow-y-auto bg-card hidden sm:block relative"
                        style={{ width: panelWidth }}
                    >
                        {/* Drag handle */}
                        <div
                            onMouseDown={startResize}
                            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize
                                       hover:bg-lav/30 transition-colors z-10"
                            title="Drag to resize"
                        />
                        <MetaPanel
                            entryId={docId}
                            aiOptIn={aiOptIn}
                            moods={moods}
                            tags={tags}
                            wordCount={wordCount}
                            onMoodsChange={handleMoodsChange}
                            onTagsChange={handleTagsChange}
                        />
                        <AIReflectionPanel
                            entryId={docId}
                            wordCount={wordCount}
                            aiOptIn={aiOptIn}
                        />
                    </div>
                )}

                {/* Mobile meta panel — bottom sheet */}
                {metaOpen && !focusMode && (
                    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30
                          bg-card border-t border-border rounded-t-2xl
                          shadow-lg max-h-[45vh] overflow-y-auto">
                        <div className="flex justify-center pt-2 pb-1">
                            <div className="w-8 h-1 bg-border rounded-full" />
                        </div>
                        <MetaPanel
                            entryId={docId}
                            aiOptIn={aiOptIn}
                            moods={moods}
                            tags={tags}
                            wordCount={wordCount}
                            onMoodsChange={handleMoodsChange}
                            onTagsChange={handleTagsChange}
                        />
                        <AIReflectionPanel
                            entryId={docId}
                            wordCount={wordCount}
                            aiOptIn={aiOptIn}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}