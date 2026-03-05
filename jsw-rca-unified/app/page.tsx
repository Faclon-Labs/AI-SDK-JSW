"use client"

import dynamic from 'next/dynamic'
import { useAuth } from '../hooks/useAuth'

// ssr: false ensures the component is only rendered on the client — pure CSR
const Dashboard = dynamic(() => import('../diagnosis-dashboard'), { ssr: false })

export default function Page() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Authenticating...</p>
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', gap: '12px' }}>
        <h2>Authentication Required</h2>
        <p>Please log in to the IOsense portal, go to <strong>Profile</strong>, generate an SSO token, and open this app with <code>?token=&lt;your-token&gt;</code> appended to the URL.</p>
        {auth.error && <p style={{ color: 'red' }}>Error: {auth.error}</p>}
      </div>
    )
  }

  return <Dashboard />
}
