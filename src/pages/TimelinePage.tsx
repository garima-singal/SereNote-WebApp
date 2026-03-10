import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntries } from '@/hooks/useEntries'
import { MOODS } from '@/types/mood'
import { format, isSameMonth } from 'date-fns'
import type { Entry, MoodType } from '@/types/entry'

type SortOrder = 'newest' | 'oldest'

export const TimelinePage = () => {
    const { entries, loading } = useEntries()
    const navigate = useNavigate()

    const [search, setSearch] = useState('')
    const [moodFilter, setMoodFilter] = useState<MoodType | null>(null)
    const [tagFilter, setTagFilter] = useState<string | null>(null)
    const [sort, setSort] = useState<SortOrder>('newest')
    const [showFilters, setShowFilters] = useState(false)

    // All unique tags across all entries
    const allTags = useMemo(() => {
        const set = new Set<string>()
        entries.forEach(e => e.tags.forEach(t => set.add(t)))
        return Array.from(set).sort()
    }, [entries])

    // Filtered + sorted entries
    const filtered = useMemo(() => {
        let list = [...entries]
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.bodyText.toLowerCase().includes(q) ||
                e.tags.some(t => t.toLowerCase().includes(q))
            )
        }
        if (moodFilter) list = list.filter(e => e.moods.includes(moodFilter))
        if (tagFilter) list = list.filter(e => e.tags.includes(tagFilter))
        list.sort((a, b) =>
            sort === 'newest'
                ? b.createdAt.getTime() - a.createdAt.getTime()
                : a.createdAt.getTime() - b.createdAt.getTime()
        )
        return list
    }, [entries, search, moodFilter, tagFilter, sort])

    // Group by month
    const grouped = useMemo(() => {
        const groups: { label: string; date: Date; entries: Entry[] }[] = []
        filtered.forEach(entry => {
            const existing = groups.find(g => isSameMonth(g.date, entry.createdAt))
            if (existing) {
                existing.entries.push(entry)
            } else {
                groups.push({ label: format(entry.createdAt, 'MMMM yyyy'), date: entry.createdAt, entries: [entry] })
            }
        })
        return groups
    }, [filtered])

    const activeFilters = [moodFilter, tagFilter, search.trim()].filter(Boolean).length

    const clearFilters = () => {
        setSearch('')
        setMoodFilter(null)
        setTagFilter(null)
    }

    return (
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-3xl mx-auto">

            {/* ── HEADER ── */}
            <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                    <h1 className="font-lora text-xl sm:text-2xl font-semibold text-ink">
                        Timeline
                    </h1>
                    <p className="text-xs text-muted mt-0.5">
                        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} total
                    </p>
                </div>
                <button
                    onClick={() => navigate('/write')}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-accent
                     text-white rounded-xl text-xs sm:text-sm font-medium
                     hover:opacity-90 transition-opacity shrink-0"
                >
                    <span className="text-base leading-none">+</span>
                    <span className="hidden sm:inline">New Entry</span>
                    <span className="sm:hidden">New</span>
                </button>
            </div>

            {/* ── SEARCH BAR ── */}
            <div className="relative mb-3">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2
                         text-muted text-sm pointer-events-none">⌕</span>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search entries…"
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

            {/* ── FILTER + SORT BAR ── */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">

                {/* Filter button */}
                <button
                    onClick={() => setShowFilters(o => !o)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border
                      text-xs font-medium transition-colors ${showFilters || activeFilters > 0
                            ? 'bg-accent-pale text-accent border-accent'
                            : 'bg-card text-muted border-border hover:text-ink'
                        }`}
                >
                    ⊞ Filters
                    {activeFilters > 0 && (
                        <span className="bg-accent text-white rounded-full w-4 h-4
                             flex items-center justify-center text-[10px]">
                            {activeFilters}
                        </span>
                    )}
                </button>

                {/* Sort toggle */}
                <button
                    onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border
                     border-border bg-card text-xs text-muted hover:text-ink
                     transition-colors font-medium"
                >
                    {sort === 'newest' ? '↓ Newest' : '↑ Oldest'}
                </button>

                {/* Active filter chips — scrollable on mobile */}
                <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
                    {moodFilter && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-accent-pale
                             text-accent rounded-xl text-xs font-medium border
                             border-accent whitespace-nowrap shrink-0">
                            {MOODS.find(m => m.value === moodFilter)?.emoji}{' '}
                            {MOODS.find(m => m.value === moodFilter)?.label}
                            <button onClick={() => setMoodFilter(null)} className="hover:opacity-60 ml-0.5">×</button>
                        </span>
                    )}
                    {tagFilter && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-accent-pale
                             text-accent rounded-xl text-xs font-medium border
                             border-accent whitespace-nowrap shrink-0">
                            #{tagFilter}
                            <button onClick={() => setTagFilter(null)} className="hover:opacity-60 ml-0.5">×</button>
                        </span>
                    )}
                </div>

                {/* Clear all */}
                {activeFilters > 0 && (
                    <button
                        onClick={clearFilters}
                        className="text-xs text-muted hover:text-terra transition-colors shrink-0"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* ── FILTER PANEL ── */}
            {showFilters && (
                <div className="bg-card border border-border rounded-2xl p-4 mb-4">

                    {/* Mood filter */}
                    <div className="mb-4">
                        <div className="text-[10px] font-semibold text-muted uppercase
                            tracking-wider mb-2">
                            Filter by mood
                        </div>
                        {/* Scrollable on mobile */}
                        <div className="flex gap-1.5 flex-wrap">
                            {MOODS.map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => setMoodFilter(moodFilter === m.value ? null : m.value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                               border text-xs transition-all whitespace-nowrap ${moodFilter === m.value
                                            ? `${m.color} border-current font-medium`
                                            : 'border-border text-ink2 bg-bg hover:border-accent hover:bg-accent-pale hover:text-accent'
                                        }`}
                                >
                                    {m.emoji} {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tag filter */}
                    {allTags.length > 0 ? (
                        <div>
                            <div className="text-[10px] font-semibold text-muted uppercase
                              tracking-wider mb-2">
                                Filter by tag
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                                        className={`px-3 py-1.5 rounded-xl border text-xs
                                 transition-all font-medium ${tagFilter === tag
                                                ? 'bg-accent-pale text-accent border-accent'
                                                : 'border-border text-ink2 bg-bg hover:border-accent hover:bg-accent-pale hover:text-accent'
                                            }`}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-muted">
                            No tags yet — add tags while writing entries.
                        </div>
                    )}
                </div>
            )}

            {/* ── LOADING ── */}
            {loading && (
                <div className="text-center py-16 text-sm text-muted">
                    Loading entries...
                </div>
            )}

            {/* ── EMPTY STATE ── */}
            {!loading && entries.length === 0 && (
                <div className="text-center py-16 px-4">
                    <div className="text-4xl mb-4">✦</div>
                    <div className="font-lora text-lg text-ink mb-2">Your journal awaits</div>
                    <div className="text-sm text-muted mb-6">
                        Start writing to see your entries here
                    </div>
                    <button
                        onClick={() => navigate('/write')}
                        className="px-6 py-2.5 bg-accent text-white rounded-xl
                       text-sm font-medium hover:opacity-90"
                    >
                        Write first entry
                    </button>
                </div>
            )}

            {/* ── NO RESULTS ── */}
            {!loading && entries.length > 0 && filtered.length === 0 && (
                <div className="text-center py-16 px-4">
                    <div className="text-3xl mb-3">◎</div>
                    <div className="font-lora text-base text-ink mb-1">No entries found</div>
                    <div className="text-sm text-muted mb-4">
                        Try adjusting your search or filters
                    </div>
                    <button onClick={clearFilters} className="text-sm text-accent hover:underline">
                        Clear all filters
                    </button>
                </div>
            )}

            {/* ── GROUPED ENTRIES ── */}
            {!loading && grouped.map(group => (
                <div key={group.label} className="mb-8">

                    {/* Month label */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="font-lora text-sm sm:text-base font-semibold text-ink shrink-0">
                            {group.label}
                        </div>
                        <div className="flex-1 h-px bg-border" />
                        <div className="text-xs text-muted shrink-0">
                            {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2">
                        {group.entries.map(entry => (
                            <EntryCard
                                key={entry.id}
                                entry={entry}
                                searchQuery={search}
                                onClick={() => navigate(`/write/${entry.id}`)}
                            />
                        ))}
                    </div>

                </div>
            ))}

        </div>
    )
}

// ── ENTRY CARD ────────────────────────────────────────────────
const EntryCard = ({
    entry,
    searchQuery,
    onClick,
}: {
    entry: Entry
    searchQuery: string
    onClick: () => void
}) => {
    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text
        const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        return text.replace(regex, '<mark style="background:#E8F0E9;color:#7A9E7E;border-radius:2px;padding:0 2px">$1</mark>')
    }

    const highlightedTitle = highlightText(entry.title || 'Untitled Entry', searchQuery)

    return (
        <div
            onClick={onClick}
            className="bg-card border border-border rounded-2xl px-4 py-3.5
                 hover:border-accent hover:shadow-sm transition-all
                 cursor-pointer group"
        >
            <div className="flex items-start justify-between gap-2 sm:gap-3">

                {/* Left */}
                <div className="flex-1 min-w-0">

                    {/* Date */}
                    <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                        {format(entry.createdAt, 'EEE, MMM d · h:mm a')}
                    </div>

                    {/* Title */}
                    <div
                        className="font-lora text-sm font-semibold text-ink mb-1
                       group-hover:text-accent transition-colors leading-snug"
                        dangerouslySetInnerHTML={{ __html: highlightedTitle }}
                    />

                    {/* Preview — 1 line on mobile, 2 on desktop */}
                    {entry.bodyText && (
                        <div className="text-xs text-ink2 line-clamp-1 sm:line-clamp-2
                            leading-relaxed mb-2">
                            {entry.bodyText.slice(0, 160)}
                            {entry.bodyText.length > 160 ? '…' : ''}
                        </div>
                    )}

                    {/* Mood + tag chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {entry.moods.slice(0, 2).map(m => {
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
                        {entry.moods.length > 2 && (
                            <span className="text-[10px] text-muted">+{entry.moods.length - 2}</span>
                        )}
                        {entry.tags.slice(0, 2).map(tag => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 bg-surface text-muted rounded-lg
                           text-[10px] font-medium hidden sm:inline-block"
                            >
                                #{tag}
                            </span>
                        ))}
                        {/* On mobile just show tag count */}
                        {entry.tags.length > 0 && (
                            <span className="text-[10px] text-muted sm:hidden">
                                {entry.tags.length} tag{entry.tags.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right — word count + arrow */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] text-muted">{entry.wordCount}w</span>
                    <span className="text-muted group-hover:text-accent transition-colors text-sm">→</span>
                </div>

            </div>
        </div>
    )
}