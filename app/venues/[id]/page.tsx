import { Suspense } from "react"
import ViewFacilityPageClient from "./ViewFacilityPageClient"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ViewFacilityPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViewFacilityPageClient id={id} />
    </Suspense>
  )
}

