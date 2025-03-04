"use client"

import Image from "next/image"
import { Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Artist {
  name: string
  type: string
  image: string
  facebook: string
  category: string
}

interface RecommendedServicesProps {
  artists: Artist[]
}

export function RecommendedServices({ artists }: RecommendedServicesProps) {
  const categories = Array.from(new Set(artists.map((artist) => artist.category)))

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold text-center mb-8">Recommended Services</h2>
      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {artists
                .filter((artist) => artist.category === category)
                .map((artist, index) => (
                  <Card key={index} className="overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <CardHeader className="p-0">
                      <div className="relative w-full h-40">
                        <Image
                          src={artist.image || "/placeholder.svg"}
                          alt={artist.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="text-lg mb-1">{artist.name}</CardTitle>
                      <CardDescription>{artist.type}</CardDescription>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" className="w-full">
                        <a
                          href={artist.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center"
                        >
                          <Facebook className="w-4 h-4 mr-2" />
                          Visit Facebook
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

