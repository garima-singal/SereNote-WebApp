import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { auth } from '@/services/firebase/config'
import { format, isPast, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface Letter {
    id: string
    letter: string
    deliverAt: string
    deliverIn: number
    userNote: string
    opened: boolean
    createdAt: any
}

const DELIVER_OPTIONS = [
    { value: 3, label: '3 months', desc: 'A quick check-in' },
    { value: 6, label: '6 months', desc: 'Half a year from now' },
    { value: 12, label: '1 year', desc: 'A full year ahead' },
]

export const LetterPage = () => {
    const { user } = useAuthStore()
    const [letters, setLetters] = useState<Letter[]>([])
    const [loading, setLoading] = useState(true)
    const [writing, setWriting] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [deliverIn, setDeliverIn] = useState(6)
    const [userNote, setUserNote] = useState('')
    const [openedLetter, setOpenedLetter] = useState<Letter | null>(null)
    const [mode, setMode] = useState<'ai' | 'manual'>('ai')
    const [manualText, setManualText] = useState('')
    const [customDate, setCustomDate] = useState('')
    const [saving, setSaving] = useState(false)

    // Load letters from Firestore via API
    useEffect(() => {
        const load = async () => {
            try {
                const token = await auth.currentUser?.getIdToken()
                if (!token) return
                const res = await fetch('/api/ai/letters', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (res.ok) setLetters(data.letters ?? [])
            } catch {
                // silently fail
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    const handleGenerate = async () => {
        setGenerating(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const res = await fetch('/api/ai/letter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ deliverIn, userNote }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to write letter')

            const newLetter: Letter = {
                id: data.letterId,
                letter: data.letter,
                deliverAt: data.deliverAt,
                deliverIn: data.deliverIn,
                userNote,
                opened: false,
                createdAt: new Date(),
            }

            setLetters(prev => [newLetter, ...prev])
            setWriting(false)
            setUserNote('')
            toast.success('✦ Letter sealed! It will be ready on ' + format(parseISO(data.deliverAt), 'MMM d, yyyy'))

        } catch (e: any) {
            toast.error(e.message ?? 'Something went wrong')
        } finally {
            setGenerating(false)
        }
    }

    const handleOpen = async (letter: Letter) => {
        setOpenedLetter(letter)

        // Mark as opened if not already
        if (!letter.opened) {
            try {
                const token = await auth.currentUser?.getIdToken()
                if (!token) return
                await fetch(`/api/ai/letters/${letter.id}/open`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                })
                setLetters(prev =>
                    prev.map(l => l.id === letter.id ? { ...l, opened: true } : l)
                )
            } catch {
                // silently fail
            }
        }
    }

    const isReady = (letter: Letter) => isPast(parseISO(letter.deliverAt))

    const minDate = () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
    }

    const handleSaveManual = async () => {
        if (!manualText.trim() || !customDate) return
        setSaving(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const res = await fetch('/api/ai/letters_manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    letter: manualText,
                    deliverAt: customDate,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to save letter')

            const newLetter: Letter = {
                id: data.letterId,
                letter: manualText,
                deliverAt: customDate,
                deliverIn: 0,
                userNote: '',
                opened: false,
                createdAt: new Date(),
            }
            setLetters(prev => [newLetter, ...prev])
            setWriting(false)
            setManualText('')
            setCustomDate('')
            toast.success('✦ Letter sealed! Opens on ' + format(parseISO(customDate), 'MMM d, yyyy'))
        } catch (e: any) {
            toast.error(e.message ?? 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent
                        rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">

            {/* Header */}
            <div className="mb-8">
                <h1 className="font-lora text-2xl font-semibold text-ink mb-1">
                    Letters to Future Self
                </h1>
                <p className="text-sm text-muted">
                    Write a letter today. Open it when the time comes.
                </p>
            </div>

            {/* Write new letter */}
            {!writing ? (
                <button
                    onClick={() => setWriting(true)}
                    className="w-full py-4 border-2 border-dashed border-border
                     rounded-2xl text-sm text-muted hover:border-accent
                     hover:text-accent transition-all mb-8 flex items-center
                     justify-center gap-2"
                >
                    <span className="text-base">✦</span>
                    Write a letter to future you
                </button>
            ) : (
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                    <h2 className="font-lora text-base font-semibold text-ink mb-4">
                        ✦ Write your letter
                    </h2>

                    {/* Mode tabs */}
                    <div className="flex gap-1 bg-surface rounded-xl p-1 mb-5">
                        <button
                            onClick={() => setMode('ai')}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mode === 'ai'
                                ? 'bg-card text-ink shadow-sm'
                                : 'text-muted hover:text-ink'
                                }`}
                        >
                            ✦ AI writes it for me
                        </button>
                        <button
                            onClick={() => setMode('manual')}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mode === 'manual'
                                ? 'bg-card text-ink shadow-sm'
                                : 'text-muted hover:text-ink'
                                }`}
                        >
                            ✏️ I'll write it myself
                        </button>
                    </div>

                    {/* ── AI MODE ── */}
                    {mode === 'ai' && (
                        <>
                            {/* Delivery time */}
                            <div className="mb-5">
                                <label className="text-xs font-medium text-ink2 block mb-2">
                                    Deliver in
                                </label>
                                <div className="flex gap-2">
                                    {DELIVER_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setDeliverIn(opt.value)}
                                            className={`flex-1 py-2.5 px-3 rounded-xl border text-xs
                                  transition-all text-center ${deliverIn === opt.value
                                                    ? 'border-accent bg-accent-pale text-accent font-medium'
                                                    : 'border-border text-muted hover:border-ink2/30 hover:text-ink'
                                                }`}
                                        >
                                            <div className="font-medium">{opt.label}</div>
                                            <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Personal note */}
                            <div className="mb-5">
                                <label className="text-xs font-medium text-ink2 block mb-2">
                                    Anything specific to include?{' '}
                                    <span className="text-muted font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={userNote}
                                    onChange={e => setUserNote(e.target.value)}
                                    placeholder="e.g. I'm nervous about my job interview next week..."
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border
                             bg-bg text-ink text-sm outline-none resize-none
                             focus:border-accent transition-colors
                             placeholder:text-muted leading-relaxed"
                                />
                            </div>

                            <div className="bg-lav-pale rounded-xl p-3.5 border border-lav/20 mb-5">
                                <p className="text-xs text-ink2 leading-relaxed">
                                    <span className="text-lav font-medium">✦ How it works:</span> AI reads your recent
                                    journal entries and writes a personal letter capturing this moment — to be opened on{' '}
                                    <span className="font-medium text-ink">
                                        {format(
                                            new Date(new Date().setMonth(new Date().getMonth() + deliverIn)),
                                            'MMMM d, yyyy'
                                        )}
                                    </span>.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setWriting(false); setUserNote('') }}
                                    className="flex-1 py-2.5 border border-border rounded-xl
                             text-sm text-muted hover:text-ink transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="flex-1 py-2.5 bg-accent text-white rounded-xl
                             text-sm font-medium hover:bg-accent-dark
                             transition-colors disabled:opacity-50
                             flex items-center justify-center gap-2"
                                >
                                    {generating ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/40
                                       border-t-white rounded-full animate-spin" />
                                            Writing your letter…
                                        </>
                                    ) : (
                                        '✦ Seal & send to future me'
                                    )}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── MANUAL MODE ── */}
                    {mode === 'manual' && (
                        <>
                            {/* Letter textarea */}
                            <div className="mb-5">
                                <label className="text-xs font-medium text-ink2 block mb-2">
                                    Write your letter
                                </label>
                                <textarea
                                    value={manualText}
                                    onChange={e => setManualText(e.target.value)}
                                    placeholder={"Dear future me,I'm writing this on " + format(new Date(), 'MMMM d, yyyy') + "..."}
                                    rows={8}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border
                                bg-bg text-ink text-sm outline-none resize-none
                                focus:border-accent transition-colors font-lora
                                placeholder:text-muted leading-relaxed"
                                />
                                <div className="text-[10px] text-muted mt-1 text-right">
                                    {manualText.trim().split(/\s+/).filter(Boolean).length} words
                                </div>
                            </div>

                            {/* Custom delivery date */}
                            <div className="mb-5">
                                <label className="text-xs font-medium text-ink2 block mb-2">
                                    Deliver on
                                </label>
                                <input
                                    type="date"
                                    value={customDate}
                                    min={minDate()}
                                    onChange={e => setCustomDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border
                             bg-bg text-ink text-sm outline-none
                             focus:border-accent transition-colors"
                                />
                                {customDate && (
                                    <p className="text-[10px] text-muted mt-1">
                                        This letter will be sealed until {format(parseISO(customDate), 'MMMM d, yyyy')}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setWriting(false); setManualText(''); setCustomDate('') }}
                                    className="flex-1 py-2.5 border border-border rounded-xl
                             text-sm text-muted hover:text-ink transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveManual}
                                    disabled={saving || !manualText.trim() || !customDate}
                                    className="flex-1 py-2.5 bg-ink text-bg rounded-xl
                             text-sm font-medium hover:opacity-85
                             transition-all disabled:opacity-40
                             disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving…' : '🔒 Seal letter'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Letters list */}
            {letters.length === 0 && !writing ? (
                <div className="text-center py-12">
                    <div className="text-4xl mb-3">✉️</div>
                    <p className="text-sm text-muted">No letters yet.</p>
                    <p className="text-xs text-muted mt-1">
                        Write one — your future self will thank you.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {letters.map(letter => {
                        const ready = isReady(letter)
                        return (
                            <div
                                key={letter.id}
                                onClick={() => ready ? handleOpen(letter) : undefined}
                                className={`p-4 rounded-2xl border transition-all ${ready
                                    ? 'border-accent/30 bg-accent-pale cursor-pointer hover:border-accent hover:shadow-sm'
                                    : 'border-border bg-card'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-base">{ready ? '✉️' : '🔒'}</span>
                                        <div>
                                            <div className="text-sm font-medium text-ink">
                                                {ready ? 'Your letter is ready to open!' : `Sealed for ${letter.deliverIn} months`}
                                            </div>
                                            <div className="text-xs text-muted mt-0.5">
                                                {ready
                                                    ? `Written ${letter.createdAt ? format(
                                                        letter.createdAt.toDate ? letter.createdAt.toDate() : new Date(letter.createdAt),
                                                        'MMM d, yyyy'
                                                    ) : 'recently'}`
                                                    : `Opens on ${format(parseISO(letter.deliverAt), 'MMMM d, yyyy')}`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    {ready && (
                                        <span className="text-xs text-accent font-medium">
                                            {letter.opened ? 'Read again →' : 'Open →'}
                                        </span>
                                    )}
                                    {!ready && (
                                        <div className="text-right">
                                            <div className="text-[10px] text-muted">
                                                {Math.ceil(
                                                    (parseISO(letter.deliverAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                                )} days left
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Letter modal */}
            {openedLetter && (
                <div
                    className="fixed inset-0 z-50 bg-ink/40 flex items-center
                     justify-center p-4"
                    onClick={() => setOpenedLetter(null)}
                >
                    <div
                        className="bg-card rounded-2xl border border-border w-full
                       max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="font-lora text-lg font-semibold text-ink">
                                        A letter from your past self
                                    </h2>
                                    <p className="text-xs text-muted mt-0.5">
                                        Written {openedLetter.createdAt ? format(
                                            openedLetter.createdAt.toDate
                                                ? openedLetter.createdAt.toDate()
                                                : new Date(openedLetter.createdAt),
                                            'MMMM d, yyyy'
                                        ) : 'some time ago'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setOpenedLetter(null)}
                                    className="text-muted hover:text-ink transition-colors text-lg"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="font-lora italic text-sm text-ink leading-relaxed
                              whitespace-pre-wrap border-t border-border pt-4">
                                {openedLetter.letter}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}