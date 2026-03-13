import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { logOut } from '@/services/firebase/auth'
import {
    LayoutDashboard,
    ScrollText,
    Bookmark,
    BarChart2,
    Search,
    MessageCircle,
    User,
    Settings,
    PenLine,
    X,
} from 'lucide-react'

interface SidebarProps {
    onClose?: () => void
}

const NAV = [
    { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
    { to: '/timeline', label: 'Timeline', Icon: ScrollText, end: false },
    { to: '/bookmarks', label: 'Bookmarks', Icon: Bookmark, end: false },
    { to: '/insights', label: 'Insights', Icon: BarChart2, end: false },
    { to: '/search', label: 'Search', Icon: Search, end: false },
    { to: '/chat', label: 'Chat', Icon: MessageCircle, end: false },
]

const BOTTOM_NAV = [
    { to: '/profile', label: 'Profile', Icon: User, end: false },
    { to: '/settings', label: 'Settings', Icon: Settings, end: false },
]

export const Sidebar = ({ onClose }: SidebarProps) => {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const handleSignOut = async () => {
        await logOut()
        navigate('/auth')
    }

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
     font-medium transition-all duration-150 group
     ${isActive
            ? 'bg-accent text-white shadow-sm'
            : 'text-ink2 hover:bg-surface hover:text-ink'
        }`

    return (
        <div className="flex flex-col h-full bg-card border-r border-border w-[220px]">

            {/* ── LOGO ── */}
            <div className="px-5 py-5 border-b border-border flex items-center justify-between">
                <div>
                    <div className="font-lora text-lg font-semibold text-ink tracking-tight">
                        Sere<span className="text-accent">Note</span>
                    </div>
                    <div className="text-[10px] text-muted">Your private journal</div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden text-muted hover:text-ink transition-colors
                       w-7 h-7 flex items-center justify-center rounded-lg
                       hover:bg-surface"
                        aria-label="Close sidebar"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* ── NEW ENTRY ── */}
            <div className="px-4 pt-4 pb-2">
                <button
                    onClick={() => { navigate('/write'); onClose?.() }}
                    className="w-full py-2.5 bg-accent text-white rounded-xl text-sm
                     font-medium hover:bg-accent-dark transition-colors
                     flex items-center justify-center gap-2 shadow-sm"
                >
                    <PenLine size={14} />
                    New Entry
                </button>
            </div>

            {/* ── MAIN NAV ── */}
            <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
                {NAV.map(({ to, label, Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={linkClass}
                        onClick={onClose}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={16}
                                    className={`shrink-0 ${isActive ? 'text-white' : 'text-muted group-hover:text-ink'}`}
                                />
                                {label}
                            </>
                        )}
                    </NavLink>
                ))}

                {/* Divider */}
                <div className="my-2 border-t border-border" />

                {BOTTOM_NAV.map(({ to, label, Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={linkClass}
                        onClick={onClose}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={16}
                                    className={`shrink-0 ${isActive ? 'text-white' : 'text-muted group-hover:text-ink'}`}
                                />
                                {label}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* ── USER FOOTER ── */}
            <div className="px-4 py-4 border-t border-border">
                <div className="flex items-center gap-3">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName ?? ''}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-border shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-accent-pale text-accent
                            flex items-center justify-center text-xs font-semibold shrink-0">
                            {user?.displayName?.[0] ?? '?'}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-ink truncate">
                            {user?.displayName ?? 'You'}
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="text-[10px] text-muted hover:text-terra transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}