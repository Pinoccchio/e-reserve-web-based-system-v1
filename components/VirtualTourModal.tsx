import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"

interface VirtualTourModalProps {
  isOpen: boolean
  onClose: () => void
  facilityName: string
  images: { image_url: string }[]
}

export function VirtualTourModal({ isOpen, onClose, facilityName, images }: VirtualTourModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Virtual Tour: {facilityName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {images.map((image, index) => (
            <div key={index} className="relative w-full h-48">
              <Image
                src={image.image_url || "/placeholder.svg"}
                alt={`${facilityName} - Image ${index + 1}`}
                fill
                className="object-cover rounded-lg"
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

