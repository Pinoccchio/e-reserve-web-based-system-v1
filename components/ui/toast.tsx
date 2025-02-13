"use client"

import React from "react"
import { useState, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { X } from "lucide-react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cn } from "@/lib/utils"

export type ToastActionElement = React.ReactElement<React.ComponentProps<typeof ToastAction>>

export interface ToastProps {
  message: string
  type?: "success" | "error" | "info" | "warning"
  duration?: number
}

const Toast: React.FC<ToastProps> = ({ message, type = "info", duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  if (!isVisible) return null

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500 text-white"
      case "error":
        return "bg-red-500 text-white"
      case "warning":
        return "bg-yellow-500 text-white"
      default:
        return "bg-blue-500 text-white"
    }
  }

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center justify-between w-full max-w-sm px-4 py-2 rounded-lg shadow-lg ${getToastStyles()} transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={() => setIsVisible(false)}
        className="ml-4 inline-flex text-white hover:text-gray-100 focus:outline-none"
      >
        <X size={18} />
        <span className="sr-only">Close</span>
      </button>
    </div>
  )
}

export const showToast = (message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => {
  const createToast = () => {
    const toastRoot = document.getElementById("toast-root")
    if (!toastRoot) {
      console.error("Toast root element not found")
      return
    }

    const toastElement = document.createElement("div")
    toastRoot.appendChild(toastElement)

    const root = createRoot(toastElement)

    root.render(<Toast message={message} type={type} duration={duration} />)

    setTimeout(() => {
      root.unmount()
      toastRoot.removeChild(toastElement)
    }, duration || 5000)
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    createToast()
  } else {
    window.addEventListener("DOMContentLoaded", createToast)
  }
}

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-destructive/30 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

