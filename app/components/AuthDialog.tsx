"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/components/ui/toast"
import { Eye, EyeOff } from "lucide-react"

interface AuthDialogsProps {
  children: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AuthDialogs({ children, isOpen, onOpenChange }: AuthDialogsProps) {
  const [isLogInOpen, setIsLogInOpen] = useState(isOpen || false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isOpen !== undefined) {
      setIsLogInOpen(isOpen)
    }
  }, [isOpen])

  const openSignUpDialog = () => {
    setIsSignUpOpen(true)
  }

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    try {
      const { data: signUpData } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            account_type: "end-user", // Always set to "end-user"
          },
        },
      })

      if (signUpData.user) {
        showToast("Account created successfully. Welcome!", "success")
        setIsSignUpOpen(false)
        router.push("/end-user/dashboard")
      } else {
        showToast("There was a problem creating your account. Please try again.")
      }
    } catch {
      showToast("There was a problem creating your account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      setIsLogInOpen(false)
      showToast("Welcome back!", "success")
      // Redirect based on account type
      const accountType = signInData.user?.user_metadata.account_type
      router.push(
        accountType === "admin"
          ? "/admin/dashboard"
          : accountType === "payment_collector"
            ? "/payment_collector"
            : accountType === "mdrr_staff"
              ? "/mdrr-staff"
              : "/end-user/dashboard",
      )
    } catch {
      showToast("Invalid email or password.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateIsLogInOpen = (open: boolean) => {
    setIsLogInOpen(open)
    onOpenChange?.(open)
  }

  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement<React.HTMLAttributes<HTMLElement>>(child) && typeof child.type !== "string") {
          return React.cloneElement(child, {
            onClick: (e: React.MouseEvent<HTMLElement>) => {
              if (child.props.onClick) {
                child.props.onClick(e)
              }
              if (child.props.children === "Log In") {
                updateIsLogInOpen(true)
              } else if (child.props.children === "Sign Up") {
                openSignUpDialog()
              }
            },
          })
        }
        return child
      })}
      <Dialog open={isLogInOpen} onOpenChange={updateIsLogInOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log In</DialogTitle>
            <DialogDescription>Enter your credentials to access your account.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input id="signin-email" name="email" type="email" placeholder="Enter your email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <div className="relative">
                <Input
                  id="signin-password"
                  name="password"
                  type={showSignInPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                >
                  {showSignInPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging In..." : "Log In"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create an Account</DialogTitle>
            <DialogDescription>Fill in your details to create a new end-user account.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <Label htmlFor="signup-first-name">First Name</Label>
              <Input id="signup-first-name" name="firstName" placeholder="Enter your first name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-last-name">Last Name</Label>
              <Input id="signup-last-name" name="lastName" placeholder="Enter your last name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" placeholder="Enter your email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  name="password"
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="Create a password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                >
                  {showSignUpPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

