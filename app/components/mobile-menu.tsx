'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { AuthDialogs } from './AuthDialog'

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetTitle>Menu</SheetTitle>
        <nav className="flex flex-col space-y-4 mt-4">
          <Link href="/venues" className="text-lg" onClick={() => setIsOpen(false)}>Venues</Link>
          <Link href="/reservations" className="text-lg" onClick={() => setIsOpen(false)}>Reservations</Link>
          <Link href="/about" className="text-lg" onClick={() => setIsOpen(false)}>About</Link>
          <Link href="/contact" className="text-lg" onClick={() => setIsOpen(false)}>Contact</Link>
        </nav>
        <div className="mt-8">
          <AuthDialogs />
        </div>
      </SheetContent>
    </Sheet>
  )
}

