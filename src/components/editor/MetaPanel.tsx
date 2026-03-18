import { useState, useRef } from 'react'
import { MOODS } from '@/types/mood'
import { auth } from '@/services/firebase/config'
import type { MoodType } from '@/types/entry'

interface MetaPanelProps {
    moods: MoodType[]
    tags: string[]
    wordCount: number
    entryId: string | null
    aiOptIn: boolean
    onMoodsChange: (m: MoodType[]) => void
    onTagsChange: (t: string[]) => void
}

export const MetaPanel = ({
    moods,
    tags,
    wordCount,
    entryId,
    aiOptIn,
    onMoodsChange,
    onTagsChange,
}: MetaPanelProps) => {
    const [tagInput, setTagInput] = useState('')
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
    const [tagsLoading, setTagsLoading] = useState(false)
    const [moodLoading, setMoodLoading] = useState(false)
    const [moodReasoning, setMoodReasoning] = useState('')
    const [moodError, setMoodError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const readingTime = wordCount === 0 ? null : Math.max(1, Math.ceil(wordCount / 200))

    // Toggle a mood on/off
    const toggleMood = (m: MoodType) => {
        if (moods.includes(m)) {
            onMoodsChange(moods.filter(x => x !== m))
        } else {
            onMoodsChange([...moods, m])
        }
    }

    // ── AI MOOD SUGGESTION ──────────────────────────────────
    const suggestMoods = async () => {
        if (!entryId || wordCount < 5) return
        setMoodLoading(true)
        setMoodError('')
        setMoodReasoning('')

        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const res = await fetch('/api/ai/mood', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to predict moods')

            // Merge suggested moods with existing (don't overwrite manual selections)
            const suggested = data.moods as MoodType[]
            const merged = Array.from(new Set([...moods, ...suggested])) as MoodType[]
            onMoodsChange(merged)
            setMoodReasoning(data.reasoning ?? '')

        } catch (e: any) {
            setMoodError(e.message)
        } finally {
            setMoodLoading(false)
        }
    }

    // ── AI TAG SUGGESTIONS ─────────────────────────────────────
    const suggestTags = async () => {
        if (!entryId || wordCount < 5) return
        setTagsLoading(true)
        setTagSuggestions([])
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const res = await fetch('/api/ai/tags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to suggest tags')

            // Filter out tags already added
            const newSuggestions = (data.tags as string[]).filter(t => !tags.includes(t))
            setTagSuggestions(newSuggestions)
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setTagsLoading(false)
        }
    }

    const acceptTag = (tag: string) => {
        if (!tags.includes(tag) && tags.length < 10) {
            onTagsChange([...tags, tag])
        }
        setTagSuggestions(prev => prev.filter(t => t !== tag))
    }

    const dismissTag = (tag: string) => {
        setTagSuggestions(prev => prev.filter(t => t !== tag))
    }

    // Add tag on Enter or comma
    const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const val = tagInput.trim().toLowerCase().replace(/^#/, '')
            if (val && !tags.includes(val) && tags.length < 10) {
                onTagsChange([...tags, val])
            }
            setTagInput('')
        } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
            onTagsChange(tags.slice(0, -1))
        }
    }

    return (
        <div className="p-4 flex flex-col gap-5">

            {/* ── STATS ── */}
            <div>
                <div className="text-[10px] font-semibold text-muted uppercase
                        tracking-wider mb-2">Stats</div>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Words', value: wordCount.toLocaleString() },
                        { label: 'Reading', value: readingTime ? `~${readingTime} min` : '—' },
                    ].map(s => (
                        <div key={s.label}
                            className="bg-surface rounded-xl p-2.5 text-center">
                            <div className="font-lora text-base font-semibold text-ink">
                                {s.value}
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── MOOD ── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Mood
                        {moods.length > 0 && (
                            <span className="ml-1.5 text-accent normal-case font-normal">
                                ({moods.length} selected)
                            </span>
                        )}
                    </div>

                    {/* AI suggest button — only when aiOptIn + entry saved + has content */}
                    {aiOptIn && entryId && wordCount >= 5 && (
                        <button
                            onClick={suggestMoods}
                            disabled={moodLoading}
                            className="flex items-center gap-1 text-[10px] text-lav
                         hover:text-lav/80 transition-colors disabled:opacity-50"
                        >
                            {moodLoading ? (
                                <>
                                    <span className="w-2.5 h-2.5 border border-lav border-t-transparent
                                   rounded-full animate-spin inline-block" />
                                    Predicting…
                                </>
                            ) : (
                                <>✦ Suggest</>
                            )}
                        </button>
                    )}
                </div>

                {/* Reasoning tooltip */}
                {moodReasoning && !moodLoading && (
                    <div className="mb-2 px-2.5 py-1.5 bg-lav-pale rounded-lg
                          border border-lav/20 text-[10px] text-ink2 italic">
                        {moodReasoning}
                    </div>
                )}

                {/* Error */}
                {moodError && (
                    <div className="mb-2 px-2.5 py-1.5 bg-terra-pale rounded-lg
                          border border-terra/20 text-[10px] text-terra">
                        {moodError}
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                    {MOODS.map(m => {
                        const active = moods.includes(m.value)
                        return (
                            <button
                                key={m.value}
                                onClick={() => toggleMood(m.value)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl
                            text-xs border transition-all ${active
                                        ? 'bg-accent-pale border-accent text-accent font-medium'
                                        : 'bg-bg border-border text-muted hover:border-ink2 hover:text-ink'
                                    }`}
                            >
                                <span>{m.emoji}</span>
                                <span>{m.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ── TAGS ── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Tags
                    </div>
                    {aiOptIn && entryId && wordCount >= 5 && (
                        <button
                            onClick={suggestTags}
                            disabled={tagsLoading}
                            className="flex items-center gap-1 text-[10px] text-lav
                         hover:text-lav/80 transition-colors disabled:opacity-50"
                        >
                            {tagsLoading ? (
                                <>
                                    <span className="w-2.5 h-2.5 border border-lav border-t-transparent
                                   rounded-full animate-spin inline-block" />
                                    Suggesting…
                                </>
                            ) : (
                                <>✦ Suggest</>
                            )}
                        </button>
                    )}
                </div>

                <div
                    onClick={() => inputRef.current?.focus()}
                    className="min-h-[38px] flex flex-wrap gap-1.5 p-2
                     bg-bg border border-border rounded-xl
                     cursor-text focus-within:border-accent
                     transition-colors"
                >
                    {tags.map(t => (
                        <span
                            key={t}
                            className="flex items-center gap-1 px-2 py-0.5 bg-surface
                         text-ink2 rounded-lg text-xs"
                        >
                            #{t}
                            <button
                                onClick={e => {
                                    e.stopPropagation()
                                    onTagsChange(tags.filter(x => x !== t))
                                }}
                                className="text-muted hover:text-terra transition-colors
                           leading-none ml-0.5"
                            >×</button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagKey}
                        placeholder={tags.length === 0 ? 'Add tags…' : ''}
                        className="flex-1 min-w-[60px] bg-transparent text-xs
                       text-ink outline-none placeholder:text-muted"
                    />
                </div>
                <div className="text-[10px] text-muted mt-1">
                    Press Enter or comma to add · {10 - tags.length} remaining
                </div>

                {/* AI suggested tags */}
                {tagSuggestions.length > 0 && (
                    <div className="mt-2">
                        <div className="text-[10px] text-lav font-medium mb-1.5">
                            ✦ Suggested tags
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {tagSuggestions.map(tag => (
                                <div key={tag}
                                    className="flex items-center gap-1 pl-2 pr-1 py-1
                                bg-lav-pale border border-lav/20 rounded-lg">
                                    <span className="text-[11px] text-lav">#{tag}</span>
                                    <button
                                        onClick={() => acceptTag(tag)}
                                        title="Add tag"
                                        className="w-4 h-4 rounded flex items-center justify-center
                               text-lav hover:bg-lav hover:text-white
                               transition-colors text-[10px] font-bold"
                                    >+</button>
                                    <button
                                        onClick={() => dismissTag(tag)}
                                        title="Dismiss"
                                        className="w-4 h-4 rounded flex items-center justify-center
                               text-lav/50 hover:bg-border hover:text-muted
                               transition-colors text-[10px]"
                                    >×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}