import "./globals.css"
import { Inter } from "next/font/google"
import { RootLayoutClient } from "./components/root-layout-client"
import { metadata } from "./metadata"
import type React from "react"
import { Analytics } from "@vercel/analytics/react" // Import Analytics

const inter = Inter({ subsets: ["latin"] })

export { metadata }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex flex-col min-h-screen bg-gray-50`}>
        <RootLayoutClient>{children}</RootLayoutClient>
        <Analytics /> {/* Add the Analytics component */}
        <div id="toast-root" />
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        ></script>
      </body>
    </html>
  )
}