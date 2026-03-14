import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './router'
import { initNotifications } from './services/notifications'

// Init notifications on app load (restores scheduled reminders)
initNotifications()
import { useAuth } from './hooks/useAuth'
import './index.css'

const App = () => {
    useAuth() // subscribe to Firebase auth state globally
    return (
        <>
            {/* Toaster at root level so toasts work on ALL pages including /auth */}
            <Toaster
                position="top-right"
                richColors
                toastOptions={{
                    style: { fontFamily: 'DM Sans, sans-serif' }
                }}
            />
            <RouterProvider router={router} />
        </>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
)