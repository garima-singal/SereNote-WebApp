import { useState, useEffect } from 'react'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/services/firebase/config'
import { useAuthStore } from '@/store/authStore'
import { getUserProfile, updateUserProfile, updateUserSettings } from '@/services/firebase/users'
import { useEntries } from '@/hooks/useEntries'
import { MOODS } from '@/types/mood'
import { format } from 'date-fns'
import type { UserSettings } from '@/types/user'

// ── SECTION WRAPPER ───────────────────────────────────────────
const Section = ({
    title,
    description,
    children,
    danger,
}: {
    title: string
    description?: string
    children: React.ReactNode
    danger?: boolean
}) => (
    <div className={`bg-card border rounded-2xl overflow-hidden ${danger ? 'border-terra/30' : 'border-border'
        }`}>
        <div className={`px-5 py-4 border-b ${danger ? 'border-terra/20 bg-terra-pale/40' : 'border-border'
            }`}>
            <div className={`text-sm font-semibold ${danger ? 'text-terra' : 'text-ink'}`}>
                {title}
            </div>
            {description && (
                <div className="text-xs text-muted mt-0.5">{description}</div>
            )}
        </div>
        <div className="px-5 py-2">{children}</div>
    </div>
)

// ── TOGGLE ─────────────────────────────────────────────────────
const Toggle = ({
    value,
    onChange,
}: {
    value: boolean
    onChange: (v: boolean) => void
}) => (
    <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex items-center w-11 h-6 rounded-full
                transition-colors duration-200 focus:outline-none shrink-0 ${value ? 'bg-accent' : 'bg-border'
            }`}
    >
        <span
            className={`inline-block w-4 h-4 bg-white rounded-full shadow-sm
                  transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
)

// ── SETTING ROW ───────────────────────────────────────────────
const SettingRow = ({
    label,
    description,
    children,
    vertical,
}: {
    label: string
    description?: string
    children: React.ReactNode
    vertical?: boolean
}) => (
    <div className={`py-3.5 border-b border-border last:border-0 ${vertical ? 'flex flex-col gap-2' : 'flex items-center justify-between gap-4'
        }`}>
        <div className="min-w-0">
            <div className="text-sm text-ink">{label}</div>
            {description && (
                <div className="text-xs text-muted mt-0.5 leading-relaxed">{description}</div>
            )}
        </div>
        <div className={vertical ? 'w-full' : 'shrink-0'}>{children}</div>
    </div>
)

// ── OPTION PILLS ─────────────────────────────────────────────
const OptionPills = <T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string; prefix?: string }[]
    value: T
    onChange: (v: T) => void
}) => (
    <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => (
            <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border
                    transition-colors ${value === opt.value
                        ? 'bg-accent-pale text-accent border-accent'
                        : 'bg-bg text-muted border-border hover:text-ink hover:border-ink2'
                    }`}
            >
                {opt.prefix && <span className="mr-1">{opt.prefix}</span>}
                {opt.label}
            </button>
        ))}
    </div>
)

// ── MAIN PAGE ─────────────────────────────────────────────────
export const SettingsPage = () => {
    const { user, setUser } = useAuthStore()
    const { entries } = useEntries()

    const [settings, setSettings] = useState<UserSettings>({
        theme: 'light',
        fontSize: 'md',
        fontFamily: 'lora',
        notificationsEnabled: false,
        reminderTime: '21:00',
        aiOptIn: false,
    })

    const [displayName, setDisplayName] = useState(user?.displayName ?? '')
    const [editingName, setEditingName] = useState(false)
    const [nameError, setNameError] = useState('')
    const [saveMsg, setSaveMsg] = useState('')
    const [exporting, setExporting] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [deleteInput, setDeleteInput] = useState('')

    // Load settings + displayName from Firestore on mount
    useEffect(() => {
        if (!user) return
        const load = async () => {
            const profile = await getUserProfile(user.uid)
            if (profile?.settings) setSettings(profile.settings)
            // Prefer Firestore displayName over Auth object
            // (they can differ if user updated name but didn't refresh Auth)
            const name = profile?.displayName ?? user.displayName ?? ''
            setDisplayName(name)
        }
        load()
    }, [user])

    // ── SAVE DISPLAY NAME ─────────────────────────────────────
    const handleSaveName = async () => {
        if (!user || !auth.currentUser) return
        const trimmed = displayName.trim()
        if (!trimmed) {
            setNameError('Name cannot be empty')
            return
        }
        setNameError('')
        try {
            // 1. Write to Firestore user document
            await updateUserProfile(user.uid, { displayName: trimmed })

            // 2. Update Firebase Auth profile so it persists across sessions
            await updateProfile(auth.currentUser, { displayName: trimmed })

            // 3. Update Zustand store so Dashboard greeting updates immediately
            //    without needing a page refresh or re-login
            setUser({ ...user, displayName: trimmed })

            setEditingName(false)
            setSaveMsg('Name updated ✓')
            setTimeout(() => setSaveMsg(''), 2000)
        } catch {
            setNameError('Failed to save. Please try again.')
        }
    }

    // ── SAVE A SINGLE SETTING ─────────────────────────────────
    const handleSetting = async <K extends keyof UserSettings>(
        key: K, value: UserSettings[K]
    ) => {
        const updated = { ...settings, [key]: value }
        setSettings(updated)
        if (!user) return
        await updateUserSettings(user.uid, { [key]: value })
        setSaveMsg('Saved ✓')
        setTimeout(() => setSaveMsg(''), 2000)
    }

    // ── EXPORT TO PDF ─────────────────────────────────────────
    const handleExport = async () => {
        if (entries.length === 0) return
        setExporting(true)
        try {
            const entriesHtml = entries.map(entry => {
                const moodChips = ((entry as any).moods ?? [])
                    .map((m: string) => {
                        const def = MOODS.find(x => x.value === m)
                        return def
                            ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#E8F0E9;color:#7A9E7E;border-radius:8px;font-size:11px;margin-right:4px">${def.emoji} ${def.label}</span>`
                            : ''
                    }).join('')
                const tagChips = entry.tags.map(t =>
                    `<span style="padding:2px 8px;background:#E8F0E9;color:#7A9E7E;border-radius:8px;font-size:11px;margin-right:4px">#${t}</span>`
                ).join('')

                return `
          <div style="page-break-after:always;padding:48px 0;max-width:620px;margin:0 auto">
            <div style="font-size:11px;color:#8C857C;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">
              ${format(entry.createdAt, 'EEEE, MMMM d, yyyy')}
            </div>
            <h1 style="font-family:'Lora',serif;font-size:24px;font-weight:600;color:#1C1A17;margin:0 0 16px">
              ${entry.title || 'Untitled Entry'}
            </h1>
            ${moodChips ? `<div style="margin-bottom:8px">${moodChips}</div>` : ''}
            ${tagChips ? `<div style="margin-bottom:16px">${tagChips}</div>` : ''}
            <div style="font-family:'Lora',serif;font-size:15px;line-height:1.8;color:#1C1A17">
              ${entry.body || '<p style="color:#8C857C">No content</p>'}
            </div>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E5DDD3;font-size:11px;color:#8C857C">
              ${entry.wordCount} words · ~${Math.max(1, Math.ceil(entry.wordCount / 200))} min read
            </div>
          </div>`
            }).join('')

            const html = `<!DOCTYPE html><html><head>
        <meta charset="UTF-8"/>
        <title>SereNote — ${displayName || 'My Journal'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"/>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{background:#FAF7F2;font-family:'DM Sans',sans-serif;color:#1C1A17;padding:40px}
          .cover{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;text-align:center}
          ul{list-style:disc;padding-left:1.4em;margin-bottom:.8em}
          ol{list-style:decimal;padding-left:1.4em;margin-bottom:.8em}
          li{margin-bottom:.25em}
          blockquote{border-left:3px solid #7A9E7E;padding-left:1em;color:#4A4540;font-style:italic;margin:1em 0}
          @media print{body{background:white;padding:0}}
        </style>
      </head><body>
        <div class="cover">
          <div style="font-family:'Lora',serif;font-size:48px;font-weight:600;color:#1C1A17;margin-bottom:8px">
            Sere<span style="color:#7A9E7E">Note</span>
          </div>
          <div style="font-family:'Lora',serif;font-style:italic;color:#8C857C;font-size:16px;margin-bottom:32px">
            "A quiet place to understand yourself better."
          </div>
          <div style="font-size:13px;color:#4A4540;margin-bottom:4px">${displayName || 'My Journal'}</div>
          <div style="font-size:12px;color:#8C857C">
            ${entries.length} entries · Exported ${format(new Date(), 'MMMM d, yyyy')}
          </div>
        </div>
        ${entriesHtml}
      </body></html>`

            const win = window.open('', '_blank')
            if (win) {
                win.document.write(html)
                win.document.close()
                win.onload = () => win.print()
            }
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-2xl mx-auto">

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="font-lora text-2xl font-semibold text-ink">Settings</h1>
                    <p className="text-xs text-muted mt-0.5">Manage your journal preferences</p>
                </div>
                {saveMsg && (
                    <span className="text-xs text-accent font-medium bg-accent-pale
                           px-3 py-1.5 rounded-lg">
                        {saveMsg}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-4">

                {/* ── PROFILE ── */}
                <Section title="Profile" description="Your account information">

                    <SettingRow label="Display name" description="Shown in your journal greeting">
                        {editingName ? (
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={e => { setDisplayName(e.target.value); setNameError('') }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                                        autoFocus
                                        className="px-3 py-1.5 bg-bg border border-accent rounded-xl
                                 text-sm text-ink outline-none w-40"
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        className="px-2.5 py-1.5 bg-accent text-white rounded-lg
                                 text-xs font-medium hover:bg-accent-dark transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingName(false)
                                            setNameError('')
                                            setDisplayName(user?.displayName ?? '')
                                        }}
                                        className="text-xs text-muted hover:text-ink transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                                {nameError && (
                                    <span className="text-[11px] text-terra">{nameError}</span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-ink">{displayName || '—'}</span>
                                <button
                                    onClick={() => setEditingName(true)}
                                    className="text-[11px] text-accent hover:underline"
                                >
                                    Edit
                                </button>
                            </div>
                        )}
                    </SettingRow>

                    <SettingRow label="Email">
                        <span className="text-sm text-muted">{user?.email ?? '—'}</span>
                    </SettingRow>

                    <SettingRow label="Member since">
                        <span className="text-sm text-muted">
                            {user?.metadata?.creationTime
                                ? format(new Date(user.metadata.creationTime), 'MMM d, yyyy')
                                : '—'}
                        </span>
                    </SettingRow>

                    <SettingRow label="Total entries">
                        <span className="text-sm font-semibold text-ink font-lora">
                            {entries.length}
                        </span>
                    </SettingRow>
                </Section>

                {/* ── APPEARANCE ── */}
                <Section title="Appearance" description="Personalise your writing environment">
                    <SettingRow label="Theme" vertical>
                        <OptionPills
                            value={settings.theme}
                            onChange={v => handleSetting('theme', v)}
                            options={[
                                { value: 'light', label: 'Light', prefix: '☀️' },
                                { value: 'sepia', label: 'Sepia', prefix: '📜' },
                                { value: 'dark', label: 'Dark', prefix: '🌙' },
                            ]}
                        />
                    </SettingRow>

                    <SettingRow label="Font family" description="Used in the editor" vertical>
                        <OptionPills
                            value={settings.fontFamily}
                            onChange={v => handleSetting('fontFamily', v as any)}
                            options={[
                                { value: 'lora', label: 'Lora (Serif)' },
                                { value: 'dm-sans', label: 'DM Sans (Clean)' },
                            ]}
                        />
                    </SettingRow>

                    <SettingRow label="Font size" vertical>
                        <OptionPills
                            value={settings.fontSize}
                            onChange={v => handleSetting('fontSize', v)}
                            options={[
                                { value: 'sm', label: 'Small' },
                                { value: 'md', label: 'Medium' },
                                { value: 'lg', label: 'Large' },
                            ]}
                        />
                    </SettingRow>
                </Section>

                {/* ── REMINDERS ── */}
                <Section title="Reminders" description="Daily writing nudges">
                    <SettingRow
                        label="Enable daily reminder"
                        description="Get notified to write every day"
                    >
                        <Toggle
                            value={settings.notificationsEnabled}
                            onChange={v => handleSetting('notificationsEnabled', v)}
                        />
                    </SettingRow>

                    {settings.notificationsEnabled && (
                        <SettingRow label="Reminder time" description="When to send the reminder">
                            <input
                                type="time"
                                value={settings.reminderTime}
                                onChange={e => handleSetting('reminderTime', e.target.value)}
                                className="px-3 py-1.5 bg-bg border border-border rounded-xl
                           text-sm text-ink outline-none focus:border-accent
                           transition-colors"
                            />
                        </SettingRow>
                    )}
                </Section>

                {/* ── AI ── */}
                <Section title="AI Features" description="Powered by Claude (coming soon)">
                    <SettingRow
                        label="Enable AI reflections"
                        description="Allow AI to read your entries and offer gentle, private insights"
                    >
                        <Toggle
                            value={settings.aiOptIn}
                            onChange={v => handleSetting('aiOptIn', v)}
                        />
                    </SettingRow>
                    {settings.aiOptIn && (
                        <div className="mb-3 p-3 bg-lav-pale border border-lav/20 rounded-xl
                            text-xs text-ink2 leading-relaxed">
                            ✨ AI reflections are coming soon. Your entries are never used
                            for training — only to generate your personal insights.
                        </div>
                    )}
                </Section>

                {/* ── EXPORT ── */}
                <Section title="Export Journal" description="Download all your entries as a PDF">
                    <div className="py-3.5 flex flex-col sm:flex-row sm:items-center
                          justify-between gap-3">
                        <div>
                            <div className="text-sm text-ink mb-0.5">Export to PDF</div>
                            <div className="text-xs text-muted">
                                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·
                                includes mood, tags, full content and a cover page
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={exporting || entries.length === 0}
                            className="flex items-center justify-center gap-2 px-5 py-2.5
                         bg-ink text-bg rounded-xl text-xs font-medium
                         hover:opacity-85 transition-opacity
                         disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            {exporting
                                ? <><span className="animate-pulse">●</span> Preparing...</>
                                : <>↓ Export PDF</>
                            }
                        </button>
                    </div>
                    {entries.length === 0 && (
                        <div className="pb-3 text-xs text-muted">
                            Write at least one entry to enable export.
                        </div>
                    )}
                </Section>

                {/* ── DANGER ZONE ── */}
                <Section
                    title="Danger Zone"
                    description="Irreversible actions — proceed with caution"
                    danger
                >
                    {!showDelete ? (
                        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center
                            justify-between gap-3">
                            <div>
                                <div className="text-sm text-ink">Delete account</div>
                                <div className="text-xs text-muted">
                                    Permanently deletes your account and all {entries.length} journal entries
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDelete(true)}
                                className="px-4 py-2 border border-terra text-terra rounded-xl
                           text-xs font-medium hover:bg-terra-pale transition-colors shrink-0"
                            >
                                Delete account
                            </button>
                        </div>
                    ) : (
                        <div className="py-3.5">
                            <p className="text-sm text-ink mb-1">
                                This will permanently delete your account and all{' '}
                                <strong>{entries.length} entries</strong>. This cannot be undone.
                            </p>
                            <p className="text-xs text-muted mb-3">
                                Type <strong className="text-ink">DELETE</strong> to confirm:
                            </p>
                            <input
                                type="text"
                                value={deleteInput}
                                onChange={e => setDeleteInput(e.target.value)}
                                placeholder="Type DELETE"
                                className="w-full px-3 py-2 bg-bg border border-terra/40
                           rounded-xl text-sm text-ink outline-none
                           focus:border-terra transition-colors mb-3
                           placeholder:text-muted"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowDelete(false); setDeleteInput('') }}
                                    className="flex-1 py-2 border border-border text-muted
                             rounded-xl text-xs font-medium hover:text-ink transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={deleteInput !== 'DELETE'}
                                    className="flex-1 py-2 bg-terra text-white rounded-xl
                             text-xs font-medium hover:opacity-90 transition-opacity
                             disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Permanently delete
                                </button>
                            </div>
                        </div>
                    )}
                </Section>

            </div>

            <div className="h-8" />
        </div>
    )
}