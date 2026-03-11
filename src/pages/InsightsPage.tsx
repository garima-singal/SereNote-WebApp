import { useMemo } from 'react'
import { useEntries } from '@/hooks/useEntries'
import { MOODS } from '@/types/mood'
import {
    format,
    subDays,
    startOfMonth,
    endOfMonth,
    eachMonthOfInterval,
    subMonths,
    isWithinInterval,
    getDay,
    getHours,
} from 'date-fns'
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell,
} from 'recharts'

// ── SECTION WRAPPER ───────────────────────────────────────────
const Section = ({
    title,
    description,
    children,
}: {
    title: string
    description?: string
    children: React.ReactNode
}) => (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
            <div className="text-sm font-semibold text-ink">{title}</div>
            {description && (
                <div className="text-xs text-muted mt-0.5">{description}</div>
            )}
        </div>
        <div className="px-5 py-4">{children}</div>
    </div>
)

// ── STAT PILL ─────────────────────────────────────────────────
const StatPill = ({
    value,
    label,
    accent,
}: {
    value: string | number
    label: string
    accent?: boolean
}) => (
    <div className={`flex-1 min-w-0 rounded-xl p-3 border text-center ${accent ? 'bg-accent-pale border-accent/20' : 'bg-bg border-border'
        }`}>
        <div className={`font-lora text-xl font-semibold ${accent ? 'text-accent' : 'text-ink'
            }`}>
            {value}
        </div>
        <div className="text-[10px] text-muted mt-0.5 leading-tight">{label}</div>
    </div>
)

export const InsightsPage = () => {
    const { entries, loading } = useEntries()

    // ── STREAK CALC ───────────────────────────────────────────
    const { currentStreak, bestStreak } = useMemo(() => {
        if (entries.length === 0) return { currentStreak: 0, bestStreak: 0 }
        const days = new Set(entries.map(e => format(e.createdAt, 'yyyy-MM-dd')))

        // Current streak
        let current = 0
        let d = new Date()
        while (days.has(format(d, 'yyyy-MM-dd'))) {
            current++
            d = new Date(d.getTime() - 86400000)
        }

        // Best streak
        const sorted = Array.from(days).sort()
        let best = 0, streak = 1
        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1])
            const curr = new Date(sorted[i])
            const diff = (curr.getTime() - prev.getTime()) / 86400000
            if (diff === 1) {
                streak++
                best = Math.max(best, streak)
            } else {
                streak = 1
            }
        }
        best = Math.max(best, current, 1)
        return { currentStreak: current, bestStreak: best }
    }, [entries])

    // ── TOTAL STATS ───────────────────────────────────────────
    const totalWords = useMemo(
        () => entries.reduce((a, e) => a + e.wordCount, 0),
        [entries]
    )
    const avgWords = entries.length > 0
        ? Math.round(totalWords / entries.length) : 0

    // ── HEATMAP (last 16 weeks = 112 days) ───────────────────
    const heatmapData = useMemo(() => {
        const countByDay: Record<string, number> = {}
        entries.forEach(e => {
            const key = format(e.createdAt, 'yyyy-MM-dd')
            countByDay[key] = (countByDay[key] ?? 0) + 1
        })
        const days: { date: Date; count: number; key: string }[] = []
        for (let i = 111; i >= 0; i--) {
            const date = subDays(new Date(), i)
            const key = format(date, 'yyyy-MM-dd')
            days.push({ date, count: countByDay[key] ?? 0, key })
        }
        return days
    }, [entries])

    const heatmapMax = Math.max(...heatmapData.map(d => d.count), 1)

    const heatmapColor = (count: number) => {
        if (count === 0) return 'bg-surface'
        const pct = count / heatmapMax
        if (pct < 0.33) return 'bg-accent/30'
        if (pct < 0.66) return 'bg-accent/60'
        return 'bg-accent'
    }

    // ── WORDS OVER TIME (last 6 months) ──────────────────────
    const wordsOverTime = useMemo(() => {
        const months = eachMonthOfInterval({
            start: startOfMonth(subMonths(new Date(), 5)),
            end: endOfMonth(new Date()),
        })
        return months.map(month => {
            const words = entries
                .filter(e => isWithinInterval(e.createdAt, {
                    start: startOfMonth(month),
                    end: endOfMonth(month),
                }))
                .reduce((a, e) => a + e.wordCount, 0)
            return { month: format(month, 'MMM'), words }
        })
    }, [entries])

    // ── MONTHLY ENTRY COUNT (last 6 months) ──────────────────
    const monthlyEntries = useMemo(() => {
        const months = eachMonthOfInterval({
            start: startOfMonth(subMonths(new Date(), 5)),
            end: endOfMonth(new Date()),
        })
        return months.map(month => {
            const count = entries.filter(e =>
                isWithinInterval(e.createdAt, {
                    start: startOfMonth(month),
                    end: endOfMonth(month),
                })
            ).length
            return { month: format(month, 'MMM'), count }
        })
    }, [entries])

    // ── MOOD FREQUENCY ────────────────────────────────────────
    const moodData = useMemo(() => {
        const counts: Record<string, number> = {}
        entries.forEach(e => e.moods.forEach(m => {
            counts[m] = (counts[m] ?? 0) + 1
        }))
        return MOODS
            .map(m => ({ ...m, count: counts[m.value] ?? 0 }))
            .filter(m => m.count > 0)
            .sort((a, b) => b.count - a.count)
    }, [entries])

    const totalMoods = moodData.reduce((a, m) => a + m.count, 0)

    // ── BEST WRITING DAY ─────────────────────────────────────
    const bestDay = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const counts = Array(7).fill(0)
        entries.forEach(e => counts[getDay(e.createdAt)]++)
        const max = Math.max(...counts)
        const idx = counts.indexOf(max)
        return { day: days[idx], count: max, counts, days }
    }, [entries])

    // ── BEST WRITING HOUR ─────────────────────────────────────
    const bestHour = useMemo(() => {
        const counts = Array(24).fill(0)
        entries.forEach(e => counts[getHours(e.createdAt)]++)
        const max = Math.max(...counts)
        const idx = counts.indexOf(max)
        const label = idx < 12
            ? (idx === 0 ? '12am' : `${idx}am`)
            : (idx === 12 ? '12pm' : `${idx - 12}pm`)
        const period = idx < 6 ? 'Late night 🌙'
            : idx < 12 ? 'Morning ☀️'
                : idx < 17 ? 'Afternoon 🌤'
                    : idx < 21 ? 'Evening 🌆'
                        : 'Night 🌙'
        return { label, period, count: max }
    }, [entries])

    // Custom tooltip for recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-card border border-border rounded-xl px-3 py-2
                      text-xs shadow-sm">
                <div className="text-muted mb-0.5">{label}</div>
                <div className="font-semibold text-ink">{payload[0].value}</div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-sm text-muted">
                Loading insights…
            </div>
        )
    }

    if (entries.length === 0) {
        return (
            <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-3xl mx-auto">
                <h1 className="font-lora text-2xl font-semibold text-ink mb-2">Insights</h1>
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">✦</div>
                    <div className="font-lora text-lg text-ink mb-2">No data yet</div>
                    <div className="text-sm text-muted">
                        Write a few entries to start seeing your patterns here.
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-3xl mx-auto">

            {/* ── HEADER ── */}
            <div className="mb-6">
                <h1 className="font-lora text-xl sm:text-2xl font-semibold text-ink">
                    Insights
                </h1>
                <p className="text-xs text-muted mt-0.5">
                    Patterns from your {entries.length} journal {entries.length === 1 ? 'entry' : 'entries'}
                </p>
            </div>

            <div className="flex flex-col gap-4">

                {/* ── TOP STATS ROW ── */}
                <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                    <StatPill value={entries.length} label="Total entries" accent />
                    <StatPill value={totalWords.toLocaleString()} label="Words written" />
                    <StatPill value={`${currentStreak}d`} label="Current streak 🔥" accent />
                    <StatPill value={`${bestStreak}d`} label="Best streak" />
                </div>

                {/* ── WRITING HEATMAP ── */}
                <Section
                    title="Writing Activity"
                    description="Last 16 weeks — darker = more entries"
                >
                    {/* Week day labels */}
                    <div className="flex gap-1 mb-1 ml-0">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-[9px] text-muted w-[14px] text-center">
                                {i % 2 === 0 ? d : ''}
                            </div>
                        ))}
                    </div>

                    {/* Grid — 16 cols (weeks) × 7 rows (days) */}
                    <div className="overflow-x-auto pb-1">
                        <div
                            className="grid gap-[3px]"
                            style={{
                                gridTemplateColumns: 'repeat(16, 14px)',
                                gridTemplateRows: 'repeat(7, 14px)',
                                gridAutoFlow: 'column',
                                width: 'fit-content',
                            }}
                        >
                            {heatmapData.map(d => (
                                <div
                                    key={d.key}
                                    title={`${format(d.date, 'MMM d')}: ${d.count} ${d.count === 1 ? 'entry' : 'entries'}`}
                                    className={`w-[14px] h-[14px] rounded-[3px] cursor-default
                               transition-opacity hover:opacity-70 ${heatmapColor(d.count)}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-1.5 mt-3">
                        <span className="text-[10px] text-muted">Less</span>
                        {['bg-surface', 'bg-accent/30', 'bg-accent/60', 'bg-accent'].map((c, i) => (
                            <div key={i} className={`w-[12px] h-[12px] rounded-[2px] ${c}`} />
                        ))}
                        <span className="text-[10px] text-muted">More</span>
                    </div>
                </Section>

                {/* ── WORDS OVER TIME ── */}
                <Section
                    title="Words Written"
                    description="Monthly word count — last 6 months"
                >
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={wordsOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: '#8C857C' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#8C857C' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="words"
                                    stroke="#7A9E7E"
                                    strokeWidth={2}
                                    dot={{ fill: '#7A9E7E', r: 3, strokeWidth: 0 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Section>

                {/* ── MONTHLY ENTRIES + MOOD FREQ (2-col on desktop) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Monthly entry count */}
                    <Section
                        title="Entries per Month"
                        description="Last 6 months"
                    >
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyEntries} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11, fill: '#8C857C' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#8C857C' }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {monthlyEntries.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={i === monthlyEntries.length - 1 ? '#7A9E7E' : '#E8F0E9'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Section>

                    {/* Mood frequency */}
                    <Section
                        title="Mood Frequency"
                        description={`${totalMoods} moods logged`}
                    >
                        {moodData.length === 0 ? (
                            <div className="text-xs text-muted italic h-40 flex items-center
                              justify-center">
                                No moods logged yet
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 py-1">
                                {moodData.slice(0, 5).map(m => {
                                    const pct = totalMoods > 0
                                        ? Math.round((m.count / totalMoods) * 100) : 0
                                    return (
                                        <div key={m.value}>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-xs text-ink flex items-center gap-1.5">
                                                    {m.emoji} {m.label}
                                                </span>
                                                <span className="text-[10px] text-muted">{pct}%</span>
                                            </div>
                                            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-accent rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </Section>
                </div>

                {/* ── BEST DAY + BEST TIME (2-col on desktop) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Best writing day */}
                    <Section
                        title="Best Writing Day"
                        description="Which day of the week you write most"
                    >
                        <div className="flex items-end gap-1.5 h-20 mt-2">
                            {bestDay.days.map((day, i) => {
                                const max = Math.max(...bestDay.counts, 1)
                                const height = bestDay.counts[i] > 0
                                    ? Math.max(8, Math.round((bestDay.counts[i] / max) * 64))
                                    : 4
                                const isMax = bestDay.counts[i] === Math.max(...bestDay.counts)
                                return (
                                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                        <div
                                            className={`w-full rounded-t-md transition-all ${isMax ? 'bg-accent' : 'bg-accent/25'
                                                }`}
                                            style={{ height: `${height}px` }}
                                        />
                                        <span className={`text-[9px] ${isMax ? 'text-accent font-semibold' : 'text-muted'
                                            }`}>
                                            {day}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-3 text-xs text-ink">
                            You write most on <span className="font-semibold text-accent">
                                {bestDay.day}
                            </span>
                            {bestDay.count > 0 && (
                                <span className="text-muted"> ({bestDay.count} entries)</span>
                            )}
                        </div>
                    </Section>

                    {/* Best writing time */}
                    <Section
                        title="Best Writing Time"
                        description="Your most active hour of the day"
                    >
                        <div className="flex flex-col items-center justify-center py-4 gap-2">
                            <div className="font-lora text-4xl font-semibold text-accent">
                                {bestHour.label}
                            </div>
                            <div className="text-sm text-ink2">{bestHour.period}</div>
                            {bestHour.count > 0 && (
                                <div className="text-xs text-muted">
                                    {bestHour.count} {bestHour.count === 1 ? 'entry' : 'entries'} at this hour
                                </div>
                            )}
                        </div>
                        <div className="flex gap-0.5 items-end h-8 mt-2">
                            {Array.from({ length: 24 }).map((_, i) => {
                                const counts = entries.map(e => getHours(e.createdAt))
                                const count = counts.filter(h => h === i).length
                                const max = Math.max(...Array.from({ length: 24 }, (_, h) =>
                                    counts.filter(x => x === h).length), 1)
                                const h = Math.max(2, Math.round((count / max) * 28))
                                const isMax = i === entries.map(e => getHours(e.createdAt))
                                    .reduce((acc, h, _, arr) =>
                                        arr.filter(x => x === h).length > arr.filter(x => x === acc).length ? h : acc
                                        , 0)
                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-t-sm ${isMax ? 'bg-accent' : 'bg-accent/20'}`}
                                        style={{ height: `${h}px` }}
                                        title={`${i}:00 — ${counts.filter(h => h === i).length} entries`}
                                    />
                                )
                            })}
                        </div>
                        <div className="flex justify-between mt-0.5">
                            <span className="text-[9px] text-muted">12am</span>
                            <span className="text-[9px] text-muted">12pm</span>
                            <span className="text-[9px] text-muted">11pm</span>
                        </div>
                    </Section>
                </div>

                {/* ── STREAK SUMMARY ── */}
                <Section
                    title="Writing Streaks"
                    description="Consistency is the best habit"
                >
                    <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex-1 text-center p-4 bg-accent-pale border
                            border-accent/20 rounded-xl">
                            <div className="font-lora text-3xl font-semibold text-accent mb-0.5">
                                {currentStreak}
                            </div>
                            <div className="text-xs text-muted">Current streak 🔥</div>
                            <div className="text-[10px] text-muted mt-1">
                                {currentStreak === 0
                                    ? 'Write today to start!'
                                    : currentStreak === 1
                                        ? 'Keep going tomorrow!'
                                        : `${currentStreak} days in a row`}
                            </div>
                        </div>
                        <div className="flex-1 text-center p-4 bg-bg border
                            border-border rounded-xl">
                            <div className="font-lora text-3xl font-semibold text-ink mb-0.5">
                                {bestStreak}
                            </div>
                            <div className="text-xs text-muted">Best streak 🏆</div>
                            <div className="text-[10px] text-muted mt-1">
                                {bestStreak === currentStreak && bestStreak > 0
                                    ? 'Your best yet!'
                                    : `Personal record`}
                            </div>
                        </div>
                        <div className="flex-1 text-center p-4 bg-bg border
                            border-border rounded-xl">
                            <div className="font-lora text-3xl font-semibold text-ink mb-0.5">
                                {avgWords}
                            </div>
                            <div className="text-xs text-muted">Avg words/entry</div>
                            <div className="text-[10px] text-muted mt-1">
                                {avgWords < 100 ? 'Short & sweet'
                                    : avgWords < 300 ? 'Nice flow'
                                        : 'Deep diver ✨'}
                            </div>
                        </div>
                    </div>
                </Section>

            </div>

            {/* Bottom padding */}
            <div className="h-8" />
        </div>
    )
}