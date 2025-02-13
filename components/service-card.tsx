import Image from "next/image"
import { Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

interface ServiceCardProps {
  service: {
    name: string
    type: string
    image: string
    facebook: string
    category: string
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative w-full h-64 overflow-hidden">
          <Image
            src={service.image || "/placeholder.svg"}
            alt={service.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <CardTitle className="text-xl mb-2 group-hover:text-blue-600 transition-colors">{service.name}</CardTitle>
        <CardDescription className="text-sm font-medium">{service.type}</CardDescription>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button asChild variant="outline" className="w-full hover:bg-blue-600 hover:text-white transition-colors">
          <a
            href={service.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <Facebook className="w-4 h-4 mr-2" />
            Visit Facebook Page
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}

