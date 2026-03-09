import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
} from '@/services/firebase/auth'

export const AuthPage = () => {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleGoogle = async () => {
        setError('')
        setLoading(true)
        try {
            await signInWithGoogle()
            navigate('/')
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleEmailSubmit = async () => {
        setError('')
        setLoading(true)
        try {
            if (mode === 'signin') {
                await signInWithEmail(email, password)
            } else {
                await signUpWithEmail(email, password, name)
            }
            navigate('/')
        } catch (e: any) {
            setError(e.message.replace('Firebase: ', ''))
        } finally {
            setLoading(false)
        }
    }

    return (
        // Full screen background with subtle dot grid
        <div
            className="min-h-screen w-full flex items-center justify-center
                 px-4 py-10 bg-bg"
            style={{
                backgroundImage: 'radial-gradient(circle, #7A9E7E22 1px, transparent 1px)',
                backgroundSize: '28px 28px',
            }}
        >
            {/* ── CARD ── */}
            <div
                className="w-full max-w-[420px] bg-card rounded-2xl
                   border border-border shadow-sm px-8 py-9"
            >
                {/* Logo + tagline at top of card */}
                <div className="text-center mb-7">
                    <div className="font-lora text-3xl font-semibold text-ink">
                        Sere<span className="text-accent">Note</span>
                    </div>
                    <p className="font-lora italic text-muted text-sm mt-1.5 leading-relaxed">
                        "A quiet place to understand yourself better."
                    </p>

                    {/* Thin divider */}
                    <div className="mt-5 h-px bg-border w-16 mx-auto" />
                </div>

                {/* Mode heading */}
                <h2 className="text-base font-semibold text-ink mb-0.5">
                    {mode === 'signin' ? 'Welcome' : 'Create your journal'}
                </h2>
                <p className="text-xs text-muted mb-5">
                    {mode === 'signin'
                        ? 'Your journal is waiting for you.'
                        : 'Start your journaling journey today.'}
                </p>

                {/* Name — signup only */}
                {mode === 'signup' && (
                    <div className="mb-3.5">
                        <label className="block text-xs font-medium text-ink2 mb-1.5">
                            Your name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Aditya"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border
                         bg-bg text-ink text-sm outline-none
                         focus:border-accent transition-colors
                         placeholder:text-muted"
                        />
                    </div>
                )}

                {/* Email */}
                <div className="mb-3.5">
                    <label className="block text-xs font-medium text-ink2 mb-1.5">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border
                       bg-bg text-ink text-sm outline-none
                       focus:border-accent transition-colors
                       placeholder:text-muted"
                    />
                </div>

                {/* Password */}
                <div className="mb-5">
                    <label className="block text-xs font-medium text-ink2 mb-1.5">
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border
                       bg-bg text-ink text-sm outline-none
                       focus:border-accent transition-colors
                       placeholder:text-muted"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 text-xs text-terra bg-terra-pale
                          px-3 py-2.5 rounded-lg border border-terra/20">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleEmailSubmit}
                    disabled={loading}
                    className="w-full py-2.5 bg-ink text-bg rounded-xl text-sm
                     font-medium hover:opacity-85 transition-opacity
                     disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading
                        ? 'Please wait...'
                        : mode === 'signin'
                            ? 'Sign in to SereNote'
                            : 'Create account'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted">or</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                {/* Google */}
                <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full py-2.5 bg-surface border border-border
                     rounded-xl text-sm font-medium text-ink
                     hover:bg-border transition-colors disabled:opacity-50
                     flex items-center justify-center gap-2.5"
                >
                    {/* Google G icon using SVG */}
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                {/* Toggle mode */}
                <p className="text-xs text-muted text-center mt-5">
                    {mode === 'signin'
                        ? "Don't have an account? "
                        : 'Already have an account? '}
                    <span
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
                        className="text-accent cursor-pointer hover:underline font-medium"
                    >
                        {mode === 'signin' ? 'Create one free' : 'Sign in'}
                    </span>
                </p>

                {/* Privacy note */}
                <p className="text-[10px] text-muted text-center mt-4 leading-relaxed">
                    🔒 Your journal is completely private.<br />
                </p>

            </div>
        </div>
    )
}