import { useState, useMemo, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEntries } from '@/hooks/useEntries'
import { getUserProfile, updateUserProfile } from '@/services/firebase/users'
import { MOODS } from '@/types/mood'
import { format, differenceInDays } from 'date-fns'

export const ProfilePage = () => {
    const { user } = useAuthStore()
    const { entries, loading, refetch } = useEntries()

    // Always fetch fresh data when this page is visited
    useEffect(() => { refetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const [editing, setEditing] = useState(false)
    const [displayName, setDisplayName] = useState(user?.displayName ?? '')
    const [bio, setBio] = useState('')
    const [savedBio, setSavedBio] = useState('')
    const [saveMsg, setSaveMsg] = useState('')
    const [joinedDate, setJoinedDate] = useState<Date | null>(null)

    // Load profile from Firestore
    useEffect(() => {
        if (!user) return
        const load = async () => {
            const profile = await getUserProfile(user.uid)
            if (profile?.displayName) setDisplayName(profile.displayName)
            if ((profile as any)?.bio) {
                setBio((profile as any).bio)
                setSavedBio((profile as any).bio)
            }
        }
        load()
        if (user.metadata?.creationTime) {
            setJoinedDate(new Date(user.metadata.creationTime))
        }
    }, [user])

    // ── STATS ────────────────────────────────────────────────
    const totalWords = useMemo(
        () => entries.reduce((a, e) => a + e.wordCount, 0),
        [entries]
    )

    const avgWordsPerEntry = entries.length > 0
        ? Math.round(totalWords / entries.length)
        : 0

    const thisMonthEntries = useMemo(
        () => entries.filter(e => e.createdAt.getMonth() === new Date().getMonth()).length,
        [entries]
    )

    const longestEntry = useMemo(
        () => entries.reduce((max, e) => e.wordCount > max ? e.wordCount : max, 0),
        [entries]
    )

    // Writing streak — consecutive days with entries
    const streak = useMemo(() => {
        if (entries.length === 0) return 0
        const days = new Set(entries.map(e => format(e.createdAt, 'yyyy-MM-dd')))
        let count = 0
        let d = new Date()
        while (days.has(format(d, 'yyyy-MM-dd'))) {
            count++
            d = new Date(d.getTime() - 86400000)
        }
        return count
    }, [entries])

    // ── MOOD SUMMARY ─────────────────────────────────────────
    const moodCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        entries.forEach(e => {
            e.moods.forEach(m => {
                counts[m] = (counts[m] ?? 0) + 1
            })
        })
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
    }, [entries])

    const totalMoodCount = moodCounts.reduce((a, [, c]) => a + c, 0)

    // ── TOP TAGS ─────────────────────────────────────────────
    const topTags = useMemo(() => {
        const counts: Record<string, number> = {}
        entries.forEach(e => {
            e.tags.forEach(t => {
                counts[t] = (counts[t] ?? 0) + 1
            })
        })
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
    }, [entries])

    // ── SAVE PROFILE ─────────────────────────────────────────
    const handleSave = async () => {
        if (!user) return
        try {
            await updateUserProfile(user.uid, {
                displayName: displayName.trim(),
                bio: bio.trim(),
            })
            setSavedBio(bio.trim())
            setEditing(false)
            setSaveMsg('Profile updated ✓')
            setTimeout(() => setSaveMsg(''), 2000)
        } catch (e: any) {
            setSaveMsg('Failed to save. Try again.')
            setTimeout(() => setSaveMsg(''), 2000)
        }
    }

    // Days since joining
    const daysSinceJoined = joinedDate
        ? differenceInDays(new Date(), joinedDate)
        : null

    if (loading) {
        return (
            <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-2xl mx-auto">
                <div className="h-8 bg-surface animate-pulse rounded-xl w-24 mb-6" />
                <div className="bg-card border border-border rounded-2xl p-6 mb-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-surface animate-pulse rounded-full shrink-0" />
                    <div className="flex-1">
                        <div className="h-5 bg-surface animate-pulse rounded w-1/2 mb-2" />
                        <div className="h-3 bg-surface animate-pulse rounded w-2/3" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-4">
                            <div className="h-3 bg-surface animate-pulse rounded w-2/3 mb-2" />
                            <div className="h-6 bg-surface animate-pulse rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-2xl mx-auto">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="font-lora text-2xl font-semibold text-ink">Profile</h1>
                {saveMsg && (
                    <span className="text-xs text-accent font-medium bg-accent-pale
                           px-3 py-1.5 rounded-lg">
                        {saveMsg}
                    </span>
                )}
            </div>

            {/* ── AVATAR + INFO CARD ── */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                    {/* Avatar */}
                    <div className="shrink-0 flex flex-col items-center sm:items-start gap-2">
                        {user?.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt="avatar"
                                referrerPolicy="no-referrer"
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full
                           object-cover border-2 border-border"
                            />
                        ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full
                              bg-accent-pale flex items-center justify-center
                              border-2 border-border">
                                <span className="font-lora text-2xl font-semibold text-accent">
                                    {(displayName || user?.email || 'U')[0].toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        {editing ? (
                            /* ── EDIT FORM ── */
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="text-[10px] font-semibold text-muted
                                    uppercase tracking-wider block mb-1">
                                        Display name
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={e => setDisplayName(e.target.value)}
                                        className="w-full px-3 py-2 bg-bg border border-border
                               rounded-xl text-sm text-ink outline-none
                               focus:border-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-muted
                                    uppercase tracking-wider block mb-1">
                                        Bio
                                    </label>
                                    <textarea
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        placeholder="A little about yourself…"
                                        rows={3}
                                        maxLength={200}
                                        className="w-full px-3 py-2 bg-bg border border-border
                               rounded-xl text-sm text-ink outline-none
                               focus:border-accent transition-colors resize-none
                               placeholder:text-muted"
                                    />
                                    <div className="text-[10px] text-muted text-right mt-0.5">
                                        {bio.length}/200
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-2 bg-accent text-white rounded-xl
                               text-xs font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Save changes
                                    </button>
                                    <button
                                        onClick={() => { setEditing(false); setBio(savedBio) }}
                                        className="px-4 py-2 border border-border text-muted
                               rounded-xl text-xs hover:text-ink transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ── VIEW MODE ── */
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="font-lora text-lg font-semibold text-ink">
                                        {displayName || 'Anonymous'}
                                    </h2>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="text-[11px] text-accent hover:underline"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="text-xs text-muted mb-2">{user?.email}</div>
                                {savedBio ? (
                                    <p className="text-sm text-ink2 leading-relaxed">{savedBio}</p>
                                ) : (
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="text-xs text-muted hover:text-accent
                               transition-colors italic"
                                    >
                                        + Add a bio…
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Account info row */}
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4">
                    {joinedDate && (
                        <div className="text-center">
                            <div className="text-xs font-semibold text-ink">
                                {format(joinedDate, 'MMM yyyy')}
                            </div>
                            <div className="text-[10px] text-muted">Joined</div>
                        </div>
                    )}
                    {daysSinceJoined !== null && (
                        <div className="text-center">
                            <div className="text-xs font-semibold text-ink">
                                {daysSinceJoined}
                            </div>
                            <div className="text-[10px] text-muted">Days writing</div>
                        </div>
                    )}
                    <div className="text-center">
                        <div className="text-xs font-semibold text-ink">
                            {user?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email'}
                        </div>
                        <div className="text-[10px] text-muted">Sign-in</div>
                    </div>
                </div>
            </div>

            {/* ── WRITING STATS ── */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <div className="text-sm font-semibold text-ink mb-4">Writing Stats</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard value={entries.length.toString()} label="Total entries" accent />
                    <StatCard value={totalWords.toLocaleString()} label="Total words" />
                    <StatCard value={`${streak}`} label="Day streak 🔥" accent />
                    <StatCard value={avgWordsPerEntry.toString()} label="Avg words/entry" />
                    <StatCard value={thisMonthEntries.toString()} label="This month" />
                    <StatCard value={longestEntry.toLocaleString()} label="Longest entry" />
                </div>
            </div>

            {/* ── MOOD HISTORY ── */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <div className="text-sm font-semibold text-ink mb-1">Mood History</div>
                <div className="text-xs text-muted mb-4">
                    Based on {totalMoodCount} mood{totalMoodCount !== 1 ? 's' : ''} logged
                </div>

                {moodCounts.length === 0 ? (
                    <div className="text-xs text-muted italic">
                        No moods logged yet — add moods while writing entries.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {moodCounts.map(([value, count]) => {
                            const def = MOODS.find(m => m.value === value)
                            if (!def) return null
                            const pct = totalMoodCount > 0
                                ? Math.round((count / totalMoodCount) * 100)
                                : 0
                            return (
                                <div key={value}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span>{def.emoji}</span>
                                            <span className="text-xs text-ink">{def.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted">{count}×</span>
                                            <span className="text-xs font-medium text-ink">{pct}%</span>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-accent rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── TOP TAGS ── */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <div className="text-sm font-semibold text-ink mb-1">Most Used Tags</div>
                <div className="text-xs text-muted mb-4">
                    {topTags.length} unique tag{topTags.length !== 1 ? 's' : ''} across all entries
                </div>

                {topTags.length === 0 ? (
                    <div className="text-xs text-muted italic">
                        No tags yet — add tags while writing entries.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {topTags.map(([tag, count]) => (
                            <div
                                key={tag}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-bg
                           border border-border rounded-xl"
                            >
                                <span className="text-xs font-medium text-accent">#{tag}</span>
                                <span className="text-[10px] text-muted bg-surface px-1.5
                                 py-0.5 rounded-md">
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom padding for mobile */}
            <div className="h-8" />

        </div>
    )
}

// ── STAT CARD ─────────────────────────────────────────────────
const StatCard = ({
    value,
    label,
    accent,
}: {
    value: string
    label: string
    accent?: boolean
}) => (
    <div className={`rounded-xl p-3 border ${accent
            ? 'bg-accent-pale border-accent/20'
            : 'bg-bg border-border'
        }`}>
        <div className={`font-lora text-xl font-semibold mb-0.5 ${accent ? 'text-accent' : 'text-ink'
            }`}>
            {value}
        </div>
        <div className="text-[10px] text-muted">{label}</div>
    </div>
)