"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/components/ui/toast"
import { Eye, EyeOff } from "lucide-react"

interface AuthDialogsProps {
  children: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AuthDialogs({ children, isOpen, onOpenChange }: AuthDialogsProps) {
  const [isSignInOpen, setIsSignInOpen] = useState(isOpen || false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isOpen !== undefined) {
      setIsSignInOpen(isOpen)
    }
  }, [isOpen])

  const openSignInDialog = () => {
    setIsSignInOpen(true)
  }

  const openSignUpDialog = () => {
    setIsSignUpOpen(true)
  }

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const accountType = formData.get("accountType") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            account_type: accountType,
          },
        },
      })

      if (error) {
        throw error
      }

      showToast("Account created successfully. Welcome!", "success")
      setIsSignUpOpen(false)
      if (accountType === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/end-user/dashboard")
      }
    } catch (error) {
      showToast("There was a problem creating your account. Please try again.", "error")
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setIsSignInOpen(false)

      showToast(`Welcome, ${data.user.user_metadata.first_name}!`, "success")
    } catch (error) {
      console.error("Error during sign in:", error)
      showToast("Invalid email or password.", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const updateIsSignInOpen = (open: boolean) => {
    setIsSignInOpen(open)
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
              if (child.props.children === "Sign In") {
                updateIsSignInOpen(true)
              } else if (child.props.children === "Sign Up") {
                openSignUpDialog()
              }
            },
          })
        }
        return child
      })}
      <Dialog open={isSignInOpen} onOpenChange={updateIsSignInOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
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
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create an Account</DialogTitle>
            <DialogDescription>Fill in your details to create a new account.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <Label htmlFor="signup-account-type">Account Type</Label>
              <Select name="accountType" required>
                <SelectTrigger id="signup-account-type">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end-user">End User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

