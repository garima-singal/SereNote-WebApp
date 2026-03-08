// RouterProvider connects our router config to the React app
import { RouterProvider } from 'react-router-dom'

// We import our router with all the routes defined
import { router } from '@/router'

// We import useAuth — calling it here at the top level means
// it starts listening for auth changes as soon as the app loads
// This means by the time any page renders, we already know
// if the user is logged in or not
import { useAuth } from '@/hooks/useAuth'

const App = () => {
    // This starts the Firebase auth listener for the whole app
    // It updates authStore automatically on login/logout
    useAuth()

    // RouterProvider takes our router and renders the correct page
    // based on the current URL
    return <RouterProvider router={router} />
}

export default App