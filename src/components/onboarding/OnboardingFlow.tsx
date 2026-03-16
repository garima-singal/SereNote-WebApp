import { useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/services/firebase/config'
import { completeOnboarding } from '@/services/firebase/users'
import { applyTheme } from '@/hooks/useTheme'
import { useAuthStore } from '@/store/authStore'
import {
    requestPermission,
    registerServiceWorker,
    scheduleReminder,
    saveReminderConfig,
} from '@/services/notifications'

interface Props {
    onComplete: () => void
}

const THEMES = [
    {
        value: 'light',
        label: 'Light',
        bg: '#FAF7F2',
        card: '#FFFFFF',
        accent: '#7A9E7E',
        description: 'Clean and bright',
    },
    {
        value: 'dark',
        label: 'Dark',
        bg: '#141210',
        card: '#252220',
        accent: '#8FB893',
        description: 'Easy on the eyes',
    },
    {
        value: 'sepia',
        label: 'Sepia',
        bg: '#F5EDD9',
        card: '#EDE4CC',
        accent: '#7A6E3E',
        description: 'Warm and cozy',
    },
]

const STEP_COUNT = 3

export const OnboardingFlow = ({ onComplete }: Props) => {
    const { user, setUser } = useAuthStore()

    const [step, setStep] = useState(1)
    const [name, setName] = useState(user?.displayName ?? '')
    const [theme, setTheme] = useState('light')
    const [aiOptIn, setAiOptIn] = useState(false)
    const [reminders, setReminders] = useState(false)
    const [remindTime, setRemindTime] = useState('21:00')
    const [loading, setLoading] = useState(false)

    const handleThemeSelect = (t: string) => {
        setTheme(t)
        applyTheme(t as any)
    }

    const handleFinish = async () => {
        if (!user) return
        setLoading(true)
        try {
            // Update Firebase Auth display name
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: name })
                setUser({ ...user, displayName: name })
            }

            // Handle notifications
            if (reminders) {
                const permission = await requestPermission()
                if (permission === 'granted') {
                    await registerServiceWorker()
                    scheduleReminder(remindTime)
                    saveReminderConfig({ enabled: true, time: remindTime })
                }
            }

            // Save all to Firestore + mark onboarding complete
            await completeOnboarding(user.uid, {
                displayName: name,
                theme,
                aiOptIn,
                reminderTime: remindTime,
                notificationsEnabled: reminders,
            })

            onComplete()
        } catch (e) {
            console.error('Onboarding error:', e)
            onComplete() // Don't block user even if save fails
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center px-4"
            style={{
                backgroundImage: 'radial-gradient(circle, #7A9E7E22 1px, transparent 1px)',
                backgroundSize: '28px 28px',
            }}>

            <div className="w-full max-w-md">

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {Array.from({ length: STEP_COUNT }).map((_, i) => (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-300 ${i + 1 === step
                                ? 'w-6 h-2 bg-accent'
                                : i + 1 < step
                                    ? 'w-2 h-2 bg-accent/50'
                                    : 'w-2 h-2 bg-border'
                                }`}
                        />
                    ))}
                </div>

                {/* Card */}
                <div className="bg-card rounded-2xl border border-border shadow-sm px-8 py-8">

                    {/* ── STEP 1: Welcome + Name ── */}
                    {step === 1 && (
                        <div>
                            <div className="text-center mb-7">
                                <div className="text-3xl mb-3">🌿</div>
                                <h1 className="font-lora text-2xl font-semibold text-ink mb-2">
                                    Welcome to SereNote
                                </h1>
                                <p className="text-sm text-muted leading-relaxed">
                                    A quiet place to understand yourself better.
                                    Let's get you set up in just a moment.
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-medium text-ink2 mb-1.5">
                                    What should we call you?
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your name"
                                    autoFocus
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border
                             bg-bg text-ink text-sm outline-none
                             focus:border-accent transition-colors
                             placeholder:text-muted"
                                />
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!name.trim()}
                                className="w-full py-2.5 bg-accent text-white rounded-xl
                           text-sm font-medium hover:bg-accent-dark
                           transition-colors disabled:opacity-40
                           disabled:cursor-not-allowed"
                            >
                                Continue →
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: Theme ── */}
                    {step === 2 && (
                        <div>
                            <div className="text-center mb-6">
                                <h2 className="font-lora text-xl font-semibold text-ink mb-1.5">
                                    Choose your vibe
                                </h2>
                                <p className="text-sm text-muted">
                                    Pick a theme that feels right. You can change it anytime.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 mb-6">
                                {THEMES.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => handleThemeSelect(t.value)}
                                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl
                                border-2 transition-all text-left ${theme === t.value
                                                ? 'border-accent bg-accent-pale'
                                                : 'border-border hover:border-ink2/30'
                                            }`}
                                    >
                                        {/* Mini theme preview */}
                                        <div
                                            className="w-10 h-8 rounded-lg shrink-0 flex items-center
                                 justify-center overflow-hidden"
                                            style={{ background: t.bg }}
                                        >
                                            <div
                                                className="w-6 h-5 rounded"
                                                style={{ background: t.card }}
                                            >
                                                <div
                                                    className="w-3 h-1 rounded-full mx-auto mt-1"
                                                    style={{ background: t.accent }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-ink">{t.label}</div>
                                            <div className="text-xs text-muted">{t.description}</div>
                                        </div>
                                        {theme === t.value && (
                                            <div className="ml-auto text-accent text-base">✓</div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-2.5 border border-border rounded-xl
                             text-sm text-muted hover:text-ink hover:border-ink2/30
                             transition-colors"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex-1 py-2.5 bg-accent text-white rounded-xl
                             text-sm font-medium hover:bg-accent-dark transition-colors"
                                >
                                    Continue →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: AI + Reminders ── */}
                    {step === 3 && (
                        <div>
                            <div className="text-center mb-6">
                                <h2 className="font-lora text-xl font-semibold text-ink mb-1.5">
                                    Personalise your experience
                                </h2>
                                <p className="text-sm text-muted">
                                    You can change these anytime in Settings.
                                </p>
                            </div>

                            {/* AI opt-in */}
                            <div className="mb-4 p-4 rounded-xl border border-border bg-surface">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium text-ink flex items-center gap-1.5">
                                            <span className="text-lav">✦</span> AI Features
                                        </div>
                                        <p className="text-xs text-muted mt-0.5 leading-relaxed">
                                            Mood prediction, reflections, grammar polish,
                                            personalized prompts and more.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setAiOptIn(!aiOptIn)}
                                        className={`shrink-0 w-10 h-6 rounded-full transition-colors ${aiOptIn ? 'bg-accent' : 'bg-border'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow
                                    transition-transform mx-1 ${aiOptIn ? 'translate-x-4' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Reminders */}
                            <div className="mb-6 p-4 rounded-xl border border-border bg-surface">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <div className="text-sm font-medium text-ink">
                                            Daily reminder
                                        </div>
                                        <p className="text-xs text-muted mt-0.5">
                                            Get a gentle nudge to write every day.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setReminders(!reminders)}
                                        className={`shrink-0 w-10 h-6 rounded-full transition-colors ${reminders ? 'bg-accent' : 'bg-border'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow
                                    transition-transform mx-1 ${reminders ? 'translate-x-4' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>
                                {reminders && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted">Remind me at</span>
                                        <input
                                            type="time"
                                            value={remindTime}
                                            onChange={e => setRemindTime(e.target.value)}
                                            className="px-2.5 py-1.5 rounded-lg border border-border
                                 bg-bg text-xs text-ink outline-none
                                 focus:border-accent transition-colors"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-2.5 border border-border rounded-xl
                             text-sm text-muted hover:text-ink hover:border-ink2/30
                             transition-colors"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleFinish}
                                    disabled={loading}
                                    className="flex-1 py-2.5 bg-accent text-white rounded-xl
                             text-sm font-medium hover:bg-accent-dark
                             transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Setting up…' : 'Start journaling →'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Skip link */}
                <div className="text-center mt-4">
                    <button
                        onClick={handleFinish}
                        disabled={loading}
                        className="text-xs text-muted hover:text-ink transition-colors"
                    >
                        Skip for now
                    </button>
                </div>

            </div>
        </div>
    )
}