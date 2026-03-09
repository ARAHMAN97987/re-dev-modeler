import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthGate } from './lib/auth.jsx'
import { storage } from './lib/storage'
import App from './App.jsx'

function Root() {
  return (
    <AuthGate>
      {({ user, userId, signOut }) => {
        // Set userId in storage adapter so queries are scoped
        storage.setUserId(userId || 'anonymous')
        return <App user={user} signOut={signOut} />
      }}
    </AuthGate>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
