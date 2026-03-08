// Outlet renders whichever child route is currently active
// e.g. if path is '/', it renders DashboardPage inside here
import { Outlet } from 'react-router-dom'

export const AppShell = () => {
    return (
        // Full screen height, flex row = sidebar on left, content on right
        <div className="flex h-screen overflow-hidden">

            {/* SIDEBAR — fixed left panel */}
            <aside className="w-[210px] flex-shrink-0 h-full flex flex-col
                        bg-surface border-r border-border">

                {/* Logo */}
                <div className="px-5 py-5 border-b border-border">
                    <div className="font-lora text-xl font-semibold text-ink">
                        Sere<span className="text-accent">Note</span>
                    </div>
                    <div className="text-[10px] text-muted uppercase tracking-wider mt-1">
                        Your private space
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 p-3 flex flex-col gap-1">
                    <NavItem icon="⬡" label="Dashboard" />
                    <NavItem icon="◇" label="Bookmarks" />
                    <NavItem icon="⊘" label="Settings" />
                    <NavItem icon="👤" label="Profile" />
                </nav>

                {/* User pill at bottom */}
                <div className="p-3 border-t border-border">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                          hover:bg-border cursor-pointer transition-colors">
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center
                            justify-center text-white text-xs font-semibold">
                            A
                        </div>
                        <div>
                            <div className="text-xs font-medium text-ink">Aditya</div>
                            <div className="text-[10px] text-muted">Free plan</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT — takes remaining space, scrollable */}
            <main className="flex-1 h-full overflow-y-auto bg-bg">
                {/* Outlet renders the current page here */}
                <Outlet />
            </main>

        </div>
    )
}

// ── NAV ITEM COMPONENT ────────────────────────────────────────
// A small reusable component for each sidebar link
// Props: icon (emoji), label (text), active (highlighted or not)
const NavItem = ({
    icon,
    label,
    active = false,
}: {
    icon: string
    label: string
    active?: boolean
}) => {
    return (
        <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg
      text-sm cursor-pointer transition-colors
      ${active
                ? 'bg-accent-pale text-accent font-medium'  // active state
                : 'text-ink2 hover:bg-border'               // default state
            }
    `}>
            <span className="w-4 text-center text-xs">{icon}</span>
            {label}
        </div>
    )
}