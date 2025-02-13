"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { AuthDialogs } from "./AuthDialog"
import { MobileMenu } from "./mobile-menu"
import type React from "react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
      if (event === "SIGNED_IN") {
        if (session?.user) {
          checkUserType(session.user.id)
        }
      } else if (event === "SIGNED_OUT") {
        router.push("/")
      }
    })

    checkAuth()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setIsAuthenticated(!!session)
    if (session?.user) {
      checkUserType(session.user.id)
    }
  }

  const checkUserType = async (userId: string) => {
    const { data } = await supabase.from("users").select("account_type").eq("id", userId).single()
    if (data?.account_type === "admin") {
      router.push("/admin/dashboard")
    } else if (data?.account_type === "end-user") {
      router.push("/end-user/dashboard")
    }
  }

  const isAdminDashboard = pathname?.startsWith("/admin/dashboard")
  const isEndUserDashboard = pathname?.startsWith("/end-user/dashboard")
  const shouldShowHeader = !isAdminDashboard && !isEndUserDashboard

  if (isAuthenticated && (isAdminDashboard || isEndUserDashboard)) {
    return children
  }

  return (
    <>
      {shouldShowHeader && (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center flex-shrink-0 mr-6">
                <Link href="/" className="flex items-center">
                  <Image
                    src="/libmanan-logo.png"
                    alt="Bayan ng Libmanan Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                  <span className="ml-2 text-lg font-semibold text-gray-800 hidden sm:inline">
                    LOCAL GOVERNMENT OF LIBMANAN
                  </span>
                  <span className="ml-2 text-lg font-semibold text-gray-800 sm:hidden">LIBMANAN</span>
                </Link>
              </div>
              <nav className="hidden md:flex space-x-1 flex-grow justify-center">
                <Link
                  href="/venues"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition duration-150 ease-in-out"
                >
                  Venues
                </Link>
                <Link
                  href="/reservations"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition duration-150 ease-in-out"
                >
                  Reservations
                </Link>
                <Link
                  href="/about"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition duration-150 ease-in-out"
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition duration-150 ease-in-out"
                >
                  Contact
                </Link>
              </nav>
              <div className="hidden md:flex items-center space-x-2">
                <AuthDialogs>
                  <Button variant="ghost">Sign In</Button>
                </AuthDialogs>
                <AuthDialogs>
                  <Button variant="outline">Sign Up</Button>
                </AuthDialogs>
              </div>
              <div className="md:hidden">
                <MobileMenu />
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="flex-grow">{children}</main>
      {shouldShowHeader && (
        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-2">About E-Reserve</h3>
                <p className="text-gray-300">
                  E-Reserve is your go-to platform for managing and booking venues effortlessly.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/venues" className="text-gray-300 hover:text-white transition duration-150 ease-in-out">
                      Venues
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/reservations"
                      className="text-gray-300 hover:text-white transition duration-150 ease-in-out"
                    >
                      Reservations
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-gray-300 hover:text-white transition duration-150 ease-in-out">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-gray-300 hover:text-white transition duration-150 ease-in-out"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
                <p className="text-gray-300">Email: info@e-reserve.com</p>
                <p className="text-gray-300">Phone: (123) 456-7890</p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-300">
              © {new Date().getFullYear()} E-Reserve. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </>
  )
}

