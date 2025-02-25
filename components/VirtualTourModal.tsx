"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { X, ZoomIn } from "lucide-react"
import Image from "next/image"
import { VideoPlayer } from "@/components/VideoPlayer"
import { useState } from "react"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

interface VirtualTourModalProps {
  isOpen: boolean
  onClose: () => void
  facilityName: string
  images: { image_url: string }[]
  videoUrl?: string
}

export function VirtualTourModal({ isOpen, onClose, facilityName, images, videoUrl }: VirtualTourModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-[1200px]">
          <DialogHeader>
            <DialogTitle>Virtual Tour: {facilityName}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-100px)]">
            <div className="space-y-6 p-4">
              {videoUrl && (
                <div className="w-full aspect-video">
                  <VideoPlayer url={videoUrl} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="group relative aspect-video cursor-pointer"
                    onClick={() => setSelectedImage(image.image_url)}
                  >
                    <Image
                      src={image.image_url || "/placeholder.svg"}
                      alt={`${facilityName} - Image ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <ZoomIn className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[2000px] p-0 border-none bg-transparent">
          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>{`Full-size image of ${facilityName}`}</DialogTitle>
            </VisuallyHidden>
          </DialogHeader>
          <div className="relative w-full h-[95vh]">
            {selectedImage && (
              <>
                <Image
                  src={selectedImage || "/placeholder.svg"}
                  alt={`${facilityName} - Full View`}
                  fill
                  className="object-contain"
                  priority
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-6 w-6" />
                  <span className="sr-only">Close full-size image</span>
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

