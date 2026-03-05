import './globals.css'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <title>JSW Cement RCA Tool</title>
      </head>
      <body>{children}</body>
    </html>
  )
}
