import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/design-tokens.css'
import { AuthGate } from './lib/auth.jsx'
import { storage } from './lib/storage'
import App from './App.jsx'

function Root() {
  return (
    <AuthGate>
      {({ user, userId, signOut, publicAcademy, exitAcademy }) => {
        // Set userId in storage adapter so queries are scoped
        storage.setUserId(userId || 'anonymous')
        return <App user={user} signOut={signOut} publicAcademy={publicAcademy} exitAcademy={exitAcademy} />
      }}
    </AuthGate>
  )
}

// Force light mode — dark mode disabled
document.documentElement.setAttribute('data-theme', 'light');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
