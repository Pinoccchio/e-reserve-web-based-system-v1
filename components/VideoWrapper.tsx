"use client"

import dynamic from "next/dynamic"
import { useState, useCallback, useRef } from "react"
import { Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  url: string
}

// Import ReactPlayer dynamically to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-gray-900 animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-white">Loading video player...</span>
    </div>
  ),
})

export function VideoPlayerWrapper({ url }: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerContainerRef = useRef<HTMLDivElement>(null)

  const handleReady = useCallback(() => {
    setIsReady(true)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  return (
    <div
      ref={playerContainerRef}
      className={cn(
        "relative w-full bg-black rounded-xl overflow-hidden shadow-2xl transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video",
      )}
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-white">Loading video...</div>
        </div>
      )}
      <div className={cn("w-full h-full transition-opacity duration-300", isReady ? "opacity-100" : "opacity-0")}>
        <ReactPlayer
          url={url}
          width="100%"
          height="100%"
          onReady={handleReady}
          controls={true}
          playing={false}
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
              },
            },
          }}
        />
      </div>
      <Button
        onClick={toggleFullscreen}
        variant="ghost"
        size="icon"
        className="absolute bottom-4 right-4 text-white bg-black/50 hover:bg-black/70"
      >
        {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
      </Button>
    </div>
  )
}

