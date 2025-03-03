import { Suspense } from "react"
import ViewFacilityPageClient from "./ViewFacilityPageClient"

interface PageProps {
  params: {
    id: string
  }
}

export default function ViewFacilityPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViewFacilityPageClient id={params.id} />
    </Suspense>
  )
}

