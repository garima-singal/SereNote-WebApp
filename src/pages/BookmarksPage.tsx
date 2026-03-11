import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
    getBookmarks,
    removeBookmark,
    updateBookmarkNote,
    type Bookmark,
} from '@/services/firebase/bookmarks'
import { getEntry } from '@/services/firebase/entries'
import { MOODS } from '@/types/mood'
import { format } from 'date-fns'
import type { Entry } from '@/types/entry'

// Bookmark with hydrated entry data
interface HydratedBookmark extends Bookmark {
    entry: Entry | null
}

export const BookmarksPage = () => {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [bookmarks, setBookmarks] = useState<HydratedBookmark[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Load bookmarks + hydrate with entry data
    useEffect(() => {
        if (!user) return
        const load = async () => {
            setLoading(true)
            try {
                const raw = await getBookmarks(user.uid)
                // Fetch each linked entry in parallel
                const hydrated = await Promise.all(
                    raw.map(async bm => ({
                        ...bm,
                        entry: await getEntry(user.uid, bm.entryId),
                    }))
                )
                // Filter out bookmarks whose entries were deleted
                setBookmarks(hydrated.filter(bm => bm.entry && !bm.entry.isDeleted))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    // Search across title, bodyText, note and tags
    const filtered = useMemo(() => {
        if (!search.trim()) return bookmarks
        const q = search.toLowerCase()
        return bookmarks.filter(bm =>
            bm.entry?.title.toLowerCase().includes(q) ||
            bm.entry?.bodyText.toLowerCase().includes(q) ||
            bm.note.toLowerCase().includes(q) ||
            bm.entry?.tags.some(t => t.toLowerCase().includes(q))
        )
    }, [bookmarks, search])

    // Remove a bookmark
    const handleRemove = async (bookmarkId: string) => {
        if (!user) return
        await removeBookmark(user.uid, bookmarkId)
        setBookmarks(prev => prev.filter(bm => bm.id !== bookmarkId))
    }

    // Update note inline
    const handleNoteUpdate = async (bookmarkId: string, note: string) => {
        if (!user) return
        await updateBookmarkNote(user.uid, bookmarkId, note)
        setBookmarks(prev =>
            prev.map(bm => bm.id === bookmarkId ? { ...bm, note } : bm)
        )
    }

    return (
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-2xl mx-auto">

            {/* ── HEADER ── */}
            <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                    <h1 className="font-lora text-xl sm:text-2xl font-semibold text-ink">
                        Bookmarks
                    </h1>
                    <p className="text-xs text-muted mt-0.5">
                        {bookmarks.length} saved {bookmarks.length === 1 ? 'entry' : 'entries'}
                    </p>
                </div>
            </div>

            {/* ── SEARCH ── */}
            {bookmarks.length > 0 && (
                <div className="relative mb-4">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2
                           text-muted text-sm pointer-events-none">⌕</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search bookmarks…"
                        className="w-full pl-9 pr-9 py-2.5 bg-card border border-border
                       rounded-xl text-sm text-ink outline-none
                       focus:border-accent transition-colors placeholder:text-muted"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2
                         text-muted hover:text-ink"
                        >×</button>
                    )}
                </div>
            )}

            {/* ── LOADING ── */}
            {loading && (
                <div className="text-center py-16 text-sm text-muted">
                    Loading bookmarks...
                </div>
            )}

            {/* ── EMPTY STATE ── */}
            {!loading && bookmarks.length === 0 && (
                <div className="text-center py-16 px-4">
                    <div className="text-4xl mb-4">◈</div>
                    <div className="font-lora text-lg text-ink mb-2">No bookmarks yet</div>
                    <div className="text-sm text-muted mb-6 leading-relaxed">
                        While reading an entry, tap the bookmark icon to save it here
                        for quick access later.
                    </div>
                    <button
                        onClick={() => navigate('/timeline')}
                        className="px-6 py-2.5 bg-accent text-white rounded-xl
                       text-sm font-medium hover:opacity-90"
                    >
                        Browse entries
                    </button>
                </div>
            )}

            {/* ── NO RESULTS ── */}
            {!loading && bookmarks.length > 0 && filtered.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-3xl mb-3">◎</div>
                    <div className="font-lora text-base text-ink mb-1">No results</div>
                    <div className="text-sm text-muted mb-3">
                        No bookmarks match your search
                    </div>
                    <button
                        onClick={() => setSearch('')}
                        className="text-sm text-accent hover:underline"
                    >
                        Clear search
                    </button>
                </div>
            )}

            {/* ── BOOKMARK CARDS ── */}
            {!loading && (
                <div className="flex flex-col gap-3">
                    {filtered.map(bm => (
                        <BookmarkCard
                            key={bm.id}
                            bookmark={bm}
                            searchQuery={search}
                            onOpen={() => navigate(`/write/${bm.entryId}`)}
                            onRemove={() => handleRemove(bm.id)}
                            onNoteUpdate={(note) => handleNoteUpdate(bm.id, note)}
                        />
                    ))}
                </div>
            )}

        </div>
    )
}

// ── BOOKMARK CARD ─────────────────────────────────────────────
const BookmarkCard = ({
    bookmark,
    searchQuery,
    onOpen,
    onRemove,
    onNoteUpdate,
}: {
    bookmark: HydratedBookmark
    searchQuery: string
    onOpen: () => void
    onRemove: () => void
    onNoteUpdate: (note: string) => void
}) => {
    const [editingNote, setEditingNote] = useState(false)
    const [noteValue, setNoteValue] = useState(bookmark.note)
    const [confirming, setConfirming] = useState(false)

    const entry = bookmark.entry

    // Highlight search matches
    const highlight = (text: string) => {
        if (!searchQuery.trim()) return text
        const regex = new RegExp(
            `(${searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'
        )
        return text.replace(
            regex,
            '<mark style="background:#E8F0E9;color:#7A9E7E;border-radius:2px;padding:0 2px">$1</mark>'
        )
    }

    const handleNoteSave = () => {
        onNoteUpdate(noteValue)
        setEditingNote(false)
    }

    if (!entry) return null

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden
                    hover:border-accent/50 transition-all group">

            {/* ── ENTRY CONTENT ── */}
            <div
                className="px-4 pt-4 pb-3 cursor-pointer"
                onClick={onOpen}
            >
                {/* Date */}
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                    {format(entry.createdAt, 'EEE, MMM d, yyyy')}
                    {' · '}
                    Bookmarked {format(bookmark.createdAt, 'MMM d')}
                </div>

                {/* Title */}
                <div
                    className="font-lora text-sm font-semibold text-ink mb-1.5
                     group-hover:text-accent transition-colors leading-snug"
                    dangerouslySetInnerHTML={{
                        __html: highlight(entry.title || 'Untitled Entry')
                    }}
                />

                {/* Preview */}
                {entry.bodyText && (
                    <div className="text-xs text-ink2 line-clamp-2 leading-relaxed mb-2.5">
                        {entry.bodyText.slice(0, 180)}
                        {entry.bodyText.length > 180 ? '…' : ''}
                    </div>
                )}

                {/* Mood + tags row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.moods.slice(0, 3).map(m => {
                        const def = MOODS.find(x => x.value === m)
                        return def ? (
                            <span
                                key={m}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg
                             text-[10px] font-medium ${def.color}`}
                            >
                                {def.emoji}
                                <span className="hidden sm:inline">{def.label}</span>
                            </span>
                        ) : null
                    })}
                    {entry.tags.slice(0, 3).map(tag => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-surface text-muted rounded-lg
                         text-[10px] font-medium"
                        >
                            #{tag}
                        </span>
                    ))}
                    <span className="ml-auto text-[10px] text-muted">
                        {entry.wordCount}w
                    </span>
                </div>
            </div>

            {/* ── NOTE SECTION ── */}
            <div className="px-4 py-3 border-t border-border bg-surface/50">
                {editingNote ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={noteValue}
                            onChange={e => setNoteValue(e.target.value)}
                            placeholder="Add a note about this entry…"
                            rows={2}
                            maxLength={200}
                            autoFocus
                            className="w-full px-3 py-2 bg-bg border border-border
                         rounded-xl text-xs text-ink outline-none
                         focus:border-accent transition-colors resize-none
                         placeholder:text-muted"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleNoteSave}
                                className="px-3 py-1.5 bg-accent text-white rounded-lg
                           text-xs font-medium hover:opacity-90"
                            >
                                Save note
                            </button>
                            <button
                                onClick={() => {
                                    setNoteValue(bookmark.note)
                                    setEditingNote(false)
                                }}
                                className="text-xs text-muted hover:text-ink"
                            >
                                Cancel
                            </button>
                            <span className="text-[10px] text-muted ml-auto">
                                {noteValue.length}/200
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            {bookmark.note ? (
                                <p className="text-xs text-ink2 leading-relaxed">
                                    💬 {bookmark.note}
                                </p>
                            ) : (
                                <button
                                    onClick={() => setEditingNote(true)}
                                    className="text-xs text-muted hover:text-accent
                             transition-colors italic"
                                >
                                    + Add a note…
                                </button>
                            )}
                            {bookmark.note && (
                                <button
                                    onClick={() => setEditingNote(true)}
                                    className="text-[10px] text-accent hover:underline mt-1 block"
                                >
                                    Edit note
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={onOpen}
                                className="text-xs text-accent hover:underline font-medium"
                            >
                                Open →
                            </button>
                            {confirming ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted">Remove?</span>
                                    <button
                                        onClick={onRemove}
                                        className="text-[10px] text-terra font-medium hover:underline"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => setConfirming(false)}
                                        className="text-[10px] text-muted hover:text-ink"
                                    >
                                        No
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirming(true)}
                                    className="text-[10px] text-muted hover:text-terra
                             transition-colors"
                                    title="Remove bookmark"
                                >
                                    ◈ Remove
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}