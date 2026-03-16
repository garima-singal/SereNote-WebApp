// src/hooks/useVoice.ts
// ─────────────────────────────────────────────────────────────
// Voice-to-text using the Web Speech API.
// Works on Chrome, Edge, and Safari (iOS 14.5+).
// Firefox does not support this API.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'

export type VoiceStatus = 'idle' | 'listening' | 'unsupported'

interface UseVoiceOptions {
    onTranscript: (text: string) => void
    onInterim?: (text: string) => void
    lang?: string
}

export const useVoice = ({
    onTranscript,
    onInterim,
    lang = 'en-IN',
}: UseVoiceOptions) => {
    const [status, setStatus] = useState<VoiceStatus>(
        typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
            ? 'idle'
            : 'unsupported'
    )
    const [interimText, setInterimText] = useState('')
    const recognitionRef = useRef<any>(null)

    const start = useCallback(() => {
        if (status === 'unsupported') return

        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) {
            setStatus('unsupported')
            return
        }

        const recognition = new SpeechRecognition()
        recognitionRef.current = recognition

        recognition.lang = lang
        recognition.continuous = true    // keep listening until stopped
        recognition.interimResults = true    // show live transcript
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
            setStatus('listening')
            setInterimText('')
        }

        recognition.onresult = (event: any) => {
            let interim = ''
            let final = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    final += transcript
                } else {
                    interim += transcript
                }
            }

            if (interim) {
                setInterimText(interim)
                onInterim?.(interim)
            }

            if (final) {
                setInterimText('')
                onTranscript(final)
            }
        }

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            setStatus('idle')
            setInterimText('')
        }

        recognition.onend = () => {
            setStatus('idle')
            setInterimText('')
        }

        recognition.start()
    }, [status, lang, onTranscript, onInterim])

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        setStatus('idle')
        setInterimText('')
    }, [])

    const toggle = useCallback(() => {
        if (status === 'listening') {
            stop()
        } else {
            start()
        }
    }, [status, start, stop])

    return {
        status,
        interimText,
        isListening: status === 'listening',
        isUnsupported: status === 'unsupported',
        start,
        stop,
        toggle,
    }
}