"use client"

import dynamic from 'next/dynamic'

// ssr: false ensures the component is only rendered on the client — pure CSR
const Component = dynamic(() => import('../diagnosis-dashboard'), { ssr: false })

export default function Page() {
  return <Component />
}
