import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEntries } from '@/hooks/useEntries'
import { MOODS } from '@/types/mood'
import { useNavigate } from 'react-router-dom'
import { format, subYears, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

// ── SKELETON ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className: string }) => (
    <div className={`bg-surface animate-pulse rounded-lg ${className}`} />
)

const EntryRowSkeleton = () => (
    <div className="px-4 py-3 border-b border-border last:border-0">
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-1/3" />
    </div>
)

// ── STAT ROW ─────────────────────────────────────────────────────────────────
const StatRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs font-semibold text-ink">{value}</span>
    </div>
)

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
export const DashboardPage = () => {
    const { user } = useAuthStore()
    const { entries, loading, refetch } = useEntries()
    const navigate = useNavigate()

    // Re-fetch entries whenever user navigates back to this page
    // This ensures newly saved entries appear without a full reload
    useEffect(() => {
        refetch()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const firstName = user?.displayName?.split(' ')[0] ?? 'there'
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const today = format(new Date(), 'EEEE, MMMM d')

    const recentEntries = entries.slice(0, 3)

    const prompts = [
        'What made today worth it?',
        'What are you grateful for right now?',
        "What's been on your mind lately?",
        'Describe a moment today that made you smile.',
        'What would you tell your past self?',
        'What are you looking forward to?',
        'What did you learn today?',
    ]
    const prompt = prompts[new Date().getDay()]

    const totalWords = entries.reduce((a, e) => a + e.wordCount, 0)
    const thisMonthCount = entries.filter(
        e => e.createdAt.getMonth() === new Date().getMonth()
    ).length

    const lastYearDate = subYears(new Date(), 1)
    const lastYearEntry = entries.find(e =>
        isWithinInterval(e.createdAt, {
            start: startOfDay(lastYearDate),
            end: endOfDay(lastYearDate),
        })
    )

    return (
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-5xl mx-auto">

            {/* ── GREETING ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between
                      gap-3 mb-5">
                <div>
                    <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                        {today}
                    </div>
                    <h1 className="font-lora text-xl sm:text-2xl font-semibold text-ink">
                        {greeting},{' '}
                        <span className="italic text-accent">{firstName}</span> ✦
                    </h1>
                </div>
                <button
                    onClick={() => navigate('/write')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white
                     rounded-xl text-sm font-medium hover:bg-accent-dark
                     transition-colors self-start sm:self-auto shrink-0 shadow-sm"
                >
                    <span className="text-base leading-none">+</span>
                    New Entry
                </button>
            </div>

            {/* ── MOOD CHECK-IN ── */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-3">
                    How are you feeling?
                </div>
                <div className="flex gap-2 flex-wrap">
                    {MOODS.map((mood) => (
                        <button
                            key={mood.value}
                            onClick={() => navigate('/write')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         border border-border bg-bg text-xs text-ink2
                         hover:border-accent hover:bg-accent-pale hover:text-accent
                         transition-all duration-150 cursor-pointer whitespace-nowrap"
                        >
                            <span>{mood.emoji}</span>
                            {mood.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MAIN GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                {/* Recent Entries */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <div className="text-sm font-semibold text-ink">Recent Entries</div>
                        {!loading && entries.length > 0 && (
                            <button
                                onClick={() => navigate('/timeline')}
                                className="text-xs text-accent hover:text-accent-dark transition-colors
                           hover:underline"
                            >
                                View all →
                            </button>
                        )}
                    </div>

                    {loading ? (
                        // ── SKELETON ──
                        <div>
                            <EntryRowSkeleton />
                            <EntryRowSkeleton />
                            <EntryRowSkeleton />
                        </div>
                    ) : recentEntries.length === 0 ? (
                        // ── EMPTY STATE ──
                        <div className="p-10 text-center">
                            <div className="text-4xl mb-3">✦</div>
                            <div className="font-lora text-base text-ink mb-1.5">
                                Your journal awaits
                            </div>
                            <div className="text-xs text-muted mb-5 leading-relaxed max-w-[220px] mx-auto">
                                Every great story starts with a single entry. Write yours today.
                            </div>
                            <button
                                onClick={() => navigate('/write')}
                                className="px-5 py-2.5 bg-accent text-white rounded-xl text-xs
                           font-medium hover:bg-accent-dark transition-colors shadow-sm"
                            >
                                Write first entry
                            </button>
                        </div>
                    ) : (
                        // ── ENTRIES ──
                        <div className="divide-y divide-border">
                            {recentEntries.map((entry) => (
                                <div
                                    key={entry.id}
                                    onClick={() => navigate(`/write/${entry.id}`)}
                                    className="px-4 py-3.5 hover:bg-bg transition-colors duration-100
                             cursor-pointer group"
                                >
                                    <div className="font-lora text-sm font-semibold text-ink mb-1
                                  group-hover:text-accent-dark transition-colors duration-100">
                                        {entry.title || 'Untitled Entry'}
                                    </div>
                                    <div className="text-xs text-ink2 line-clamp-1 mb-2 leading-relaxed">
                                        {entry.bodyText || 'No content yet…'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {entry.moods?.[0] && (
                                            <span className="text-sm leading-none">
                                                {MOODS.find(m => m.value === entry.moods[0])?.emoji}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-muted">
                                            {format(entry.createdAt, 'MMM d')}
                                        </span>
                                        <span className="text-[10px] text-muted">
                                            · {entry.wordCount} words
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-4">

                    {/* Streak Card */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-border">
                            <div className="text-sm font-semibold text-ink">Writing Streak</div>
                        </div>
                        {loading ? (
                            <div className="px-4 py-3">
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <div className="px-4 py-3 flex items-center gap-4">
                                <div className="shrink-0 text-center">
                                    <span className="font-lora text-2xl font-semibold text-ink
                                   leading-none block">
                                        {entries.length > 0 ? '1' : '0'}
                                    </span>
                                    <span className="text-[9px] text-muted">day streak 🔥</span>
                                </div>
                                <div className="w-px h-8 bg-border shrink-0" />
                                {/* Heatmap */}
                                <div>
                                    <div className="flex flex-col gap-[3px]">
                                        {Array.from({ length: 4 }).map((_, row) => (
                                            <div key={row} className="flex gap-[3px]">
                                                {Array.from({ length: 7 }).map((_, col) => {
                                                    const i = row * 7 + col
                                                    const hasEntry = i >= 24
                                                    return (
                                                        <div
                                                            key={col}
                                                            className={`w-[14px] h-[8px] rounded-[2px] transition-colors
                                ${hasEntry ? 'bg-accent' : 'bg-surface'}`}
                                                        />
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-[9px] text-muted mt-1">Last 4 weeks</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* This Day Last Year */}
                    <div className="flex-1 bg-lav-pale border border-lav/20 rounded-2xl p-4
                          flex flex-col min-h-[140px]">
                        <div className="text-[10px] font-semibold text-lav uppercase
                            tracking-wider mb-2.5">
                            This Day Last Year
                        </div>
                        {loading ? (
                            <div className="flex-1 flex flex-col gap-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        ) : lastYearEntry ? (
                            <div
                                onClick={() => navigate(`/write/${lastYearEntry.id}`)}
                                className="flex-1 cursor-pointer group"
                            >
                                <div className="font-lora text-sm font-semibold text-ink mb-1
                                group-hover:text-lav transition-colors">
                                    {lastYearEntry.title || 'Untitled Entry'}
                                </div>
                                <div className="text-xs text-ink2 line-clamp-3 leading-relaxed mb-3">
                                    {lastYearEntry.bodyText || 'No content…'}
                                </div>
                                <div className="flex items-center gap-2">
                                    {lastYearEntry.moods?.[0] && (
                                        <span className="text-xs">
                                            {MOODS.find(m => m.value === lastYearEntry.moods[0])?.emoji}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-muted">
                                        {format(lastYearEntry.createdAt, 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <div className="text-[10px] text-lav font-medium mt-2
                                group-hover:underline">
                                    Read this entry →
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center
                              text-center py-2">
                                <div className="text-2xl mb-2">🕰️</div>
                                <div className="text-xs text-ink2 font-medium mb-1">No entry this day</div>
                                <div className="text-[10px] text-muted leading-relaxed">
                                    {format(lastYearDate, 'MMM d, yyyy')} was blank.
                                    Keep writing — future you will love looking back.
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* ── BOTTOM GRID ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Today's Prompt */}
                <div className="bg-terra-pale border border-terra/20 rounded-2xl p-5
                        hover:shadow-sm transition-shadow duration-200">
                    <div className="text-[10px] font-semibold text-terra uppercase
                          tracking-wider mb-2.5">
                        Today's Prompt
                    </div>
                    <div className="font-lora italic text-sm text-ink leading-relaxed mb-4">
                        "{prompt}"
                    </div>
                    <button
                        onClick={() => navigate(`/write?prompt=${encodeURIComponent(prompt)}`)}
                        className="text-xs text-terra font-medium hover:underline
                       transition-colors"
                    >
                        Write about this →
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="text-xs font-semibold text-ink mb-3">Your Journal</div>
                    {loading ? (
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            <StatRow label="Total entries" value={entries.length.toString()} />
                            <StatRow label="Total words" value={totalWords.toLocaleString()} />
                            <StatRow label="This month" value={thisMonthCount.toString()} />
                        </div>
                    )}
                </div>

                {/* Quick Write */}
                <div className="bg-card border border-border rounded-2xl p-5
                        sm:col-span-2 lg:col-span-1">
                    <div className="text-xs font-semibold text-ink mb-3">Quick Note</div>
                    <div
                        onClick={() => navigate('/write')}
                        className="w-full min-h-[72px] bg-bg border border-border rounded-xl
                       px-3 py-2.5 text-xs text-muted cursor-pointer
                       hover:border-accent hover:bg-accent-pale/30
                       transition-all duration-150 leading-relaxed"
                    >
                        What's on your mind?
                    </div>
                    <button
                        onClick={() => navigate('/write')}
                        className="w-full mt-2.5 py-2.5 bg-ink text-bg rounded-xl text-xs
                       font-medium hover:opacity-85 transition-opacity"
                    >
                        Open Editor →
                    </button>
                </div>

            </div>
        </div>
    )
}