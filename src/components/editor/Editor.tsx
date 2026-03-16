import { useEffect, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import FontFamily from '@tiptap/extension-font-family'
import { EditorToolbar } from './EditorToolbar'
import { useVoice } from '@/hooks/useVoice'

interface EditorProps {
    title: string
    body: string
    onReady?: (api: { setContent: (html: string) => void }) => void
    focusMode: boolean
    onTitleChange: (title: string) => void
    onBodyChange: (html: string, text: string, wordCount: number) => void
}

export const Editor = ({
    title,
    body,
    onReady,
    focusMode,
    onTitleChange,
    onBodyChange,
}: EditorProps) => {

    const titleRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea height as content grows
    const resizeTitle = useCallback(() => {
        const el = titleRef.current
        if (!el) return
        el.style.overflowY = 'hidden'
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
    }, [])

    useEffect(() => { resizeTitle() }, [title, resizeTitle])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Placeholder.configure({
                placeholder: 'Start writing… let your thoughts flow.',
            }),
            CharacterCount,
            Underline,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Image.configure({ inline: false, allowBase64: true }),
            FontFamily.configure({
                types: ['textStyle'],
            }),
        ],
        content: body || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            const text = editor.getText()
            const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
            onBodyChange(html, text, words)
        },
        editorProps: {
            attributes: { class: 'outline-none min-h-[60vh] prose-editor' },
        },
    })

    // Load existing content once on mount
    useEffect(() => {
        if (editor && body && editor.isEmpty) {
            editor.commands.setContent(body)
        }
    }, [editor, body])

    // Expose editor API to parent via onReady callback
    // This lets WritePage call setContent for polish without causing re-renders
    useEffect(() => {
        if (editor && onReady) {
            onReady({
                setContent: (html: string) => {
                    editor.commands.setContent(html)
                }
            })
        }
    }, [editor, onReady])



    // Image upload handler
    const handleImageUpload = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file || !editor) return
            const reader = new FileReader()
            reader.onload = (ev) => {
                const src = ev.target?.result as string
                editor.chain().focus().setImage({ src }).run()
            }
            reader.readAsDataURL(file)
        }
        input.click()
    }, [editor])

    // ── VOICE ────────────────────────────────────────────────────
    const [showInterim, setShowInterim] = useState('')

    const { status: voiceStatus, toggle: toggleVoice, isUnsupported } = useVoice({
        onTranscript: (text) => {
            if (!editor) return
            // Insert transcript at current cursor position with a space
            const textToInsert = text.trim() + ' '
            editor.chain().focus().insertContent(textToInsert).run()
            setShowInterim('')
        },
        onInterim: (text) => {
            setShowInterim(text)
        },
        lang: 'en-IN',
    })

    return (
        <div className={`transition-all duration-300 ${focusMode ? 'max-w-xl' : 'max-w-2xl'
            } mx-auto px-4 sm:px-6 py-6 sm:py-8`}>

            {/* Title — textarea auto-resizes for long prompts */}
            <textarea
                ref={titleRef}
                value={title}
                onChange={e => { onTitleChange(e.target.value); resizeTitle() }}
                placeholder="Entry title…"
                rows={1}
                className={`w-full font-lora bg-transparent outline-none border-none
                   placeholder:text-muted/40 mb-5 leading-tight resize-none
                   block transition-all duration-300
                   ${focusMode
                        ? 'text-2xl sm:text-3xl font-semibold text-ink'
                        : 'text-xl sm:text-2xl lg:text-3xl font-semibold text-ink'
                    }`}
                style={{ height: 'auto', overflowY: 'hidden' }}
            />

            {/* Toolbar — hidden in focus mode */}
            {editor && !focusMode && (
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex-1">
                        <EditorToolbar editor={editor} onImageUpload={handleImageUpload} />
                    </div>

                    {/* Mic button */}
                    {!isUnsupported && (
                        <button
                            onClick={toggleVoice}
                            title={voiceStatus === 'listening' ? 'Stop recording' : 'Voice to text'}
                            className={`shrink-0 w-8 h-8 rounded-lg border flex items-center
                          justify-center transition-all ${voiceStatus === 'listening'
                                    ? 'bg-terra text-white border-terra animate-pulse'
                                    : 'border-border text-muted hover:border-terra/40 hover:text-terra'
                                }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* Live interim transcript */}
            {voiceStatus === 'listening' && (
                <div className="mb-3 px-3 py-2 bg-terra-pale border border-terra/20
                        rounded-xl flex items-center gap-2">
                    <span className="w-2 h-2 bg-terra rounded-full animate-pulse shrink-0" />
                    <span className="text-xs text-terra italic">
                        {showInterim || 'Listening… speak now'}
                    </span>
                </div>
            )}

            {/* Editor content */}
            <EditorContent editor={editor} />

            <style>{`
        /* ── BASE ── */
        .prose-editor {
          font-family: 'Lora', serif;
          font-size: 15px;
          line-height: 1.85;
          color: #1C1A17;
        }
        @media (max-width: 640px) {
          .prose-editor { font-size: 14px; }
        }
        .prose-editor p { margin-bottom: 0.85em; }
        .prose-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #8C857C;
          pointer-events: none;
          float: left;
          height: 0;
        }

        /* ── HEADINGS ── */
        .prose-editor h2 {
          font-family: 'Lora', serif;
          font-size: 1.35rem;
          font-weight: 600;
          color: #1C1A17;
          margin-top: 1.6em;
          margin-bottom: 0.5em;
        }
        .prose-editor h3 {
          font-family: 'Lora', serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #4A4540;
          margin-top: 1.2em;
          margin-bottom: 0.4em;
        }

        /* ── INLINE ── */
        .prose-editor strong { font-weight: 600; color: #1C1A17; }
        .prose-editor em { font-style: italic; }
        .prose-editor u { text-decoration: underline; text-underline-offset: 3px; }
        .prose-editor s { text-decoration: line-through; color: #8C857C; }

        /* ── HIGHLIGHT ── */
        .prose-editor mark {
          border-radius: 3px;
          padding: 0 2px;
        }

        /* ── LINK ── */
        .prose-link {
          color: #7A9E7E;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .prose-link:hover { color: #5A7E5E; }

        /* ── LISTS ── */
        .prose-editor ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-bottom: 0.85em;
        }
        .prose-editor ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-bottom: 0.85em;
        }
        .prose-editor li { margin-bottom: 0.25em; display: list-item; }
        .prose-editor li p { margin-bottom: 0; }

        /* ── TASK LIST ── */
        .prose-editor ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0.25em;
        }
        .prose-editor ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.6em;
          margin-bottom: 0.4em;
        }
        .prose-editor ul[data-type="taskList"] li > label {
          margin-top: 3px;
          flex-shrink: 0;
        }
        .prose-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 15px;
          height: 15px;
          accent-color: #7A9E7E;
          cursor: pointer;
          border-radius: 3px;
        }
        .prose-editor ul[data-type="taskList"] li > div {
          flex: 1;
        }
        .prose-editor ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          color: #8C857C;
        }

        /* ── BLOCKQUOTE ── */
        .prose-editor blockquote {
          border-left: 3px solid #7A9E7E;
          padding-left: 1em;
          color: #4A4540;
          font-style: italic;
          margin: 1.2em 0;
        }

        /* ── HR ── */
        .prose-editor hr {
          border: none;
          border-top: 1px solid #E5DDD3;
          margin: 1.8em 0;
        }

        /* ── IMAGE ── */
        .prose-editor img {
          max-width: 100%;
          border-radius: 12px;
          margin: 1em 0;
          display: block;
        }
        .prose-editor img.ProseMirror-selectednode {
          outline: 2px solid #7A9E7E;
          outline-offset: 2px;
        }

        /* ── CODE ── */
        .prose-editor code {
          background: #F5F0E8;
          color: #C17A5A;
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 0.88em;
          font-family: 'Fira Code', monospace;
        }
        .prose-editor pre {
          background: #1C1A17;
          color: #FAF7F2;
          padding: 1em 1.2em;
          border-radius: 12px;
          overflow-x: auto;
          margin: 1em 0;
          font-size: 13px;
          line-height: 1.6;
        }

        /* ── TEXT ALIGN ── */
        .prose-editor [style*="text-align: center"] { text-align: center; }
        .prose-editor [style*="text-align: right"]  { text-align: right; }
        .prose-editor [style*="text-align: justify"] { text-align: justify; }

        /* ── FOCUS MODE ── */
        .focus-mode .prose-editor {
          font-size: 16px;
          line-height: 2;
        }

        .ProseMirror-focused { outline: none; }
      `}</style>
        </div>
    )
}