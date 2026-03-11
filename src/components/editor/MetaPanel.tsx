import { useState, useRef } from 'react'
import { MOODS } from '@/types/mood'
import type { MoodType } from '@/types/entry'

interface MetaPanelProps {
    moods: MoodType[]
    tags: string[]
    wordCount: number
    onMoodsChange: (m: MoodType[]) => void
    onTagsChange: (t: string[]) => void
}

export const MetaPanel = ({
    moods,
    tags,
    wordCount,
    onMoodsChange,
    onTagsChange,
}: MetaPanelProps) => {
    const [tagInput, setTagInput] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const readingTime = Math.max(1, Math.ceil(wordCount / 200))

    // Toggle a mood on/off
    const toggleMood = (m: MoodType) => {
        if (moods.includes(m)) {
            onMoodsChange(moods.filter(x => x !== m))
        } else {
            onMoodsChange([...moods, m])
        }
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
                        { label: 'Reading', value: `~${readingTime} min` },
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
                <div className="text-[10px] font-semibold text-muted uppercase
                        tracking-wider mb-2">
                    Mood
                    {moods.length > 0 && (
                        <span className="ml-1.5 text-accent normal-case font-normal">
                            ({moods.length} selected)
                        </span>
                    )}
                </div>
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
                <div className="text-[10px] font-semibold text-muted uppercase
                        tracking-wider mb-2">Tags</div>

                {/* Tag chips + input */}
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
            </div>
        </div>
    )
}