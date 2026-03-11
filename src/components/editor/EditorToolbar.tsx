import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface ToolbarProps {
    editor: Editor
    onImageUpload: () => void
}

// ── TOOLBAR BUTTON ────────────────────────────────────────────
const Btn = ({
    onClick, active = false, title, disabled = false, children,
}: {
    onClick: () => void
    active?: boolean
    title: string
    disabled?: boolean
    children: React.ReactNode
}) => (
    <button
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
                ${active
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-ink hover:bg-surface'
            }`}
    >
        {children}
    </button>
)

// ── DIVIDER ───────────────────────────────────────────────────
const Div = () => (
    <div className="w-px h-4 bg-border mx-0.5 shrink-0 self-center" />
)

// ── COLOR SWATCH ──────────────────────────────────────────────
const TEXT_COLORS = [
    { label: 'Default', value: '#1C1A17' },
    { label: 'Muted', value: '#8C857C' },
    { label: 'Accent', value: '#7A9E7E' },
    { label: 'Terra', value: '#C17A5A' },
    { label: 'Gold', value: '#D4A853' },
    { label: 'Lavender', value: '#9B8EC4' },
    { label: 'Red', value: '#E05252' },
    { label: 'Blue', value: '#4A90D9' },
    { label: 'Pink', value: '#E07DA0' },
    { label: 'Teal', value: '#4AAFAA' },
    { label: 'Orange', value: '#E08C42' },
    { label: 'Purple', value: '#7B5EA7' },
]

const HIGHLIGHT_COLORS = [
    { label: 'Yellow', value: '#FFF3B0' },
    { label: 'Green', value: '#D4EDDA' },
    { label: 'Pink', value: '#FCE4EC' },
    { label: 'Blue', value: '#DDEEFF' },
    { label: 'Orange', value: '#FFE8CC' },
    { label: 'Purple', value: '#EDE0FF' },
    { label: 'Peach', value: '#FFD9CC' },
    { label: 'Mint', value: '#CCFFF0' },
    { label: 'Lavender', value: '#E8E0FF' },
    { label: 'Rose', value: '#FFE0EC' },
    { label: 'Sky', value: '#CCF0FF' },
    { label: 'Lemon', value: '#FFFACC' },
]

const FONT_FAMILIES = [
    { label: 'Lora', value: 'Lora, serif', preview: 'Lora' },
    { label: 'DM Sans', value: 'DM Sans, sans-serif', preview: 'DM Sans' },
    { label: 'Georgia', value: 'Georgia, serif', preview: 'Georgia' },
    { label: 'Palatino', value: 'Palatino, serif', preview: 'Palatino' },
    { label: 'Garamond', value: 'Garamond, serif', preview: 'Garamond' },
    { label: 'Helvetica', value: 'Helvetica, sans-serif', preview: 'Helvetica' },
    { label: 'Trebuchet', value: 'Trebuchet MS, sans-serif', preview: 'Trebuchet' },
    { label: 'Courier', value: 'Courier New, monospace', preview: 'Courier' },
]

// ── COLOR PICKER POPOVER ──────────────────────────────────────
const ColorPicker = ({
    colors,
    onSelect,
    onClose,
    title,
}: {
    colors: { label: string; value: string }[]
    onSelect: (color: string) => void
    onClose: () => void
    title: string
}) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    return (
        <div
            ref={ref}
            className="absolute top-full left-0 mt-1 z-[100]
                 bg-card border border-border rounded-xl shadow-xl p-3"
            style={{ minWidth: '192px' }}
        >
            <div className="text-[10px] font-semibold text-muted uppercase
                      tracking-wider mb-2">{title}</div>
            <div className="grid grid-cols-6 gap-1.5">
                {colors.map(c => (
                    <button
                        key={c.value}
                        title={c.label}
                        onClick={() => { onSelect(c.value); onClose() }}
                        className="w-6 h-6 rounded-md border-2 border-transparent
                       hover:border-ink2 transition-all hover:scale-110 shrink-0"
                        style={{ backgroundColor: c.value }}
                    />
                ))}
            </div>
        </div>
    )
}

// ── LINK INPUT POPOVER ────────────────────────────────────────
const LinkInput = ({
    onSubmit,
    onClose,
    initial,
}: {
    onSubmit: (url: string) => void
    onClose: () => void
    initial: string
}) => {
    const [url, setUrl] = useState(initial)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    return (
        <div
            ref={ref}
            className="absolute top-full left-0 mt-1 z-50
                 bg-card border border-border rounded-xl shadow-lg p-3 w-64"
        >
            <div className="text-[10px] font-semibold text-muted uppercase
                      tracking-wider mb-2">Insert Link</div>
            <input
                autoFocus
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { onSubmit(url); onClose() } }}
                placeholder="https://…"
                className="w-full px-3 py-1.5 bg-bg border border-border rounded-lg
                   text-xs text-ink outline-none focus:border-accent
                   transition-colors mb-2"
            />
            <div className="flex gap-2">
                <button
                    onClick={() => { onSubmit(url); onClose() }}
                    className="flex-1 py-1.5 bg-accent text-white rounded-lg
                     text-xs font-medium hover:bg-accent-dark transition-colors"
                >
                    Apply
                </button>
                <button
                    onClick={onClose}
                    className="flex-1 py-1.5 border border-border text-muted
                     rounded-lg text-xs hover:text-ink transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}

// ── FONT FAMILY PICKER ────────────────────────────────────────
const FontFamilyPicker = ({
    fonts,
    current,
    onSelect,
    onClose,
}: {
    fonts: { label: string; value: string; preview: string }[]
    current: string
    onSelect: (font: string) => void
    onClose: () => void
}) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    return (
        <div
            ref={ref}
            className="absolute top-full left-0 mt-1 z-50
                 bg-card border border-border rounded-xl shadow-lg
                 p-2 w-44"
        >
            <div className="text-[10px] font-semibold text-muted uppercase
                      tracking-wider mb-1.5 px-1">Font family</div>
            {fonts.map(f => (
                <button
                    key={f.value}
                    onClick={() => onSelect(f.value)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm
                      transition-colors ${current === f.value
                            ? 'bg-accent-pale text-accent font-medium'
                            : 'text-ink hover:bg-surface'
                        }`}
                    style={{ fontFamily: f.value }}
                >
                    {f.preview}
                </button>
            ))}
        </div>
    )
}

// ── MAIN TOOLBAR ──────────────────────────────────────────────
export const EditorToolbar = ({ editor, onImageUpload }: ToolbarProps) => {
    const [showTextColor, setShowTextColor] = useState(false)
    const [showHighlight, setShowHighlight] = useState(false)
    const [showLink, setShowLink] = useState(false)
    const [showFontFamily, setShowFontFamily] = useState(false)

    // const closeAll = () => {
    //     setShowTextColor(false)
    //     setShowHighlight(false)
    //     setShowLink(false)
    //     setShowFontFamily(false)
    // }

    const currentLink = editor.getAttributes('link').href ?? ''
    const currentFontFamily = editor.getAttributes('textStyle').fontFamily ?? 'Lora, serif'
    const currentFontLabel = FONT_FAMILIES.find(f => f.value === currentFontFamily)?.label ?? 'Lora'

    const handleLink = (url: string) => {
        if (!url) {
            editor.chain().focus().unsetLink().run()
        } else {
            editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
        }
    }

    return (
        <div className="pb-3 mb-3 border-b border-border">
            <div className="flex items-center gap-0.5 flex-wrap gap-y-1">

                {/* ── FONT FAMILY ── */}
                <div className="relative overflow-visible">
                    <Btn
                        onClick={() => { setShowFontFamily(v => !v); setShowTextColor(false); setShowHighlight(false); setShowLink(false) }}
                        active={showFontFamily}
                        title="Font family"
                    >
                        <span style={{ fontFamily: currentFontFamily }} className="text-xs">
                            {currentFontLabel} ▾
                        </span>
                    </Btn>
                    {showFontFamily && (
                        <FontFamilyPicker
                            fonts={FONT_FAMILIES}
                            current={currentFontFamily}
                            onSelect={font => {
                                editor.chain().focus().setFontFamily(font).run()
                                setShowFontFamily(false)
                            }}
                            onClose={() => setShowFontFamily(false)}
                        />
                    )}
                </div>

                <Div />

                {/* ── HISTORY ── */}
                <Btn
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Undo (Ctrl+Z)"
                    disabled={!editor.can().undo()}
                >↩</Btn>
                <Btn
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Redo (Ctrl+Y)"
                    disabled={!editor.can().redo()}
                >↪</Btn>

                <Div />

                {/* ── HEADINGS ── */}
                <Btn
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >H2</Btn>
                <Btn
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    active={editor.isActive('heading', { level: 3 })}
                    title="Heading 3"
                >H3</Btn>

                <Div />

                {/* ── INLINE FORMATTING ── */}
                <Btn
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    title="Bold (Ctrl+B)"
                ><strong>B</strong></Btn>

                <Btn
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    title="Italic (Ctrl+I)"
                ><em>I</em></Btn>

                <Btn
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    title="Underline (Ctrl+U)"
                ><span className="underline">U</span></Btn>

                <Btn
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive('strike')}
                    title="Strikethrough"
                ><span className="line-through">S</span></Btn>

                <Div />

                {/* ── TEXT COLOR ── */}
                <div className="relative overflow-visible">
                    <Btn
                        onClick={() => { setShowTextColor(v => !v); setShowHighlight(false); setShowLink(false); setShowFontFamily(false) }}
                        active={showTextColor}
                        title="Text color"
                    >
                        <span className="flex items-center gap-1">
                            A
                            <span
                                className="w-2.5 h-1 rounded-sm"
                                style={{ backgroundColor: editor.getAttributes('textStyle').color ?? '#1C1A17' }}
                            />
                        </span>
                    </Btn>
                    {showTextColor && (
                        <ColorPicker
                            title="Text color"
                            colors={TEXT_COLORS}
                            onSelect={color => editor.chain().focus().setColor(color).run()}
                            onClose={() => setShowTextColor(false)}
                        />
                    )}
                </div>

                {/* ── HIGHLIGHT ── */}
                <div className="relative overflow-visible">
                    <Btn
                        onClick={() => { setShowHighlight(v => !v); setShowTextColor(false); setShowLink(false); setShowFontFamily(false) }}
                        active={showHighlight || editor.isActive('highlight')}
                        title="Highlight"
                    >
                        <span className="flex items-center gap-1">
                            ▲
                            <span
                                className="w-2.5 h-1 rounded-sm"
                                style={{ backgroundColor: editor.getAttributes('highlight').color ?? '#FFF3B0' }}
                            />
                        </span>
                    </Btn>
                    {showHighlight && (
                        <ColorPicker
                            title="Highlight color"
                            colors={HIGHLIGHT_COLORS}
                            onSelect={color => editor.chain().focus().toggleHighlight({ color }).run()}
                            onClose={() => setShowHighlight(false)}
                        />
                    )}
                </div>

                <Div />

                {/* ── TEXT ALIGN ── */}
                <Btn
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    active={editor.isActive({ textAlign: 'left' })}
                    title="Align left"
                >⬱</Btn>
                <Btn
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    active={editor.isActive({ textAlign: 'center' })}
                    title="Align center"
                >☰</Btn>
                <Btn
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    active={editor.isActive({ textAlign: 'right' })}
                    title="Align right"
                >⬰</Btn>

                <Div />

                {/* ── LISTS ── */}
                <Btn
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    title="Bullet list"
                >• List</Btn>
                <Btn
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    title="Numbered list"
                >1. List</Btn>
                <Btn
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    active={editor.isActive('taskList')}
                    title="Task / checklist"
                >☑ Tasks</Btn>

                <Div />

                {/* ── BLOCKS ── */}
                <Btn
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    active={editor.isActive('blockquote')}
                    title="Blockquote"
                >" Quote</Btn>
                <Btn
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    active={editor.isActive('codeBlock')}
                    title="Code block"
                >{'<>'} Code</Btn>
                <Btn
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="Divider"
                    active={false}
                >— Rule</Btn>

                <Div />

                {/* ── LINK ── */}
                <div className="relative overflow-visible">
                    <Btn
                        onClick={() => { setShowLink(v => !v); setShowTextColor(false); setShowHighlight(false); setShowFontFamily(false) }}
                        active={editor.isActive('link') || showLink}
                        title="Insert link"
                    >🔗 Link</Btn>
                    {showLink && (
                        <LinkInput
                            initial={currentLink}
                            onSubmit={handleLink}
                            onClose={() => setShowLink(false)}
                        />
                    )}
                </div>

                {/* ── IMAGE ── */}
                <Btn
                    onClick={onImageUpload}
                    title="Insert image"
                    active={false}
                >🖼 Image</Btn>

            </div>
        </div>
    )
}