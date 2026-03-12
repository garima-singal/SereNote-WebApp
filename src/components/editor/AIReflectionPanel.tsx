import { useState } from 'react'
import { auth } from '@/services/firebase/config'

interface Props {
    entryId: string | null
    wordCount: number
    aiOptIn: boolean
}

type Status = 'idle' | 'loading' | 'done' | 'error'

export const AIReflectionPanel = ({ entryId, wordCount, aiOptIn }: Props) => {
    const [status, setStatus] = useState<Status>('idle')
    const [reflection, setReflection] = useState<string>('')
    const [error, setError] = useState<string>('')
    const [remaining, setRemaining] = useState<number | null>(null)

    // Don't render if conditions aren't met
    if (!aiOptIn || !entryId || wordCount < 10) return null

    const generate = async () => {
        setStatus('loading')
        setError('')

        try {
            // Get fresh Firebase ID token
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const res = await fetch('/api/ai/reflect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error ?? 'Something went wrong')
            }

            setReflection(data.reflection)
            setRemaining(data.remaining)
            setStatus('done')

        } catch (e: any) {
            setError(e.message ?? 'Failed to generate reflection')
            setStatus('error')
        }
    }

    return (
        <div className="border-t border-border pt-4 mt-2">

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lav text-sm">✦</span>
                    <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                        AI Reflection
                    </span>
                </div>
                {remaining !== null && (
                    <span className="text-[10px] text-muted">{remaining} left today</span>
                )}
            </div>

            {/* Idle state — show button */}
            {status === 'idle' && (
                <button
                    onClick={generate}
                    className="w-full py-2.5 rounded-xl border border-lav text-lav
                     text-xs font-medium hover:bg-lav-pale transition-all
                     flex items-center justify-center gap-2"
                >
                    <span>✦</span>
                    Generate Reflection
                </button>
            )}

            {/* Loading */}
            {status === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className="w-3.5 h-3.5 border-2 border-lav border-t-transparent
                          rounded-full animate-spin" />
                    <span className="text-xs text-muted">Reflecting on your entry…</span>
                </div>
            )}

            {/* Result */}
            {status === 'done' && reflection && (
                <div className="space-y-3">
                    <div className="bg-lav-pale rounded-xl p-3.5 border border-lav/20">
                        <p className="text-sm text-ink2 leading-relaxed font-lora italic">
                            {reflection}
                        </p>
                    </div>
                    <button
                        onClick={() => { setStatus('idle'); setReflection('') }}
                        className="text-[10px] text-muted hover:text-lav transition-colors"
                    >
                        Generate another
                    </button>
                </div>
            )}

            {/* Error */}
            {status === 'error' && (
                <div className="space-y-2">
                    <div className="bg-terra-pale rounded-xl p-3 border border-terra/20">
                        <p className="text-xs text-terra">{error}</p>
                    </div>
                    <button
                        onClick={() => setStatus('idle')}
                        className="text-[10px] text-muted hover:text-ink transition-colors"
                    >
                        Try again
                    </button>
                </div>
            )}

        </div>
    )
}