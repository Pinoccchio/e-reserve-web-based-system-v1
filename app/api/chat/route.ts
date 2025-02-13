import { NextResponse } from "next/server"

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY
const API_URL = "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill"

// Simple knowledge base
const knowledgeBase = [
  {
    keywords: ["booking", "reserve", "reservation"],
    response:
      "To make a reservation, please visit our website's booking page or call our reservation hotline at 123-456-7890.",
  },
  {
    keywords: ["cancel", "cancellation", "refund"],
    response:
      "For cancellations, please contact us at least 24 hours before your reservation. Refunds are processed within 3-5 business days.",
  },
  {
    keywords: ["hours", "opening", "closing"],
    response: "Our facilities are open from 9 AM to 9 PM, Monday through Saturday. We're closed on Sundays.",
  },
  {
    keywords: ["price", "cost", "fee"],
    response:
      "Our prices vary depending on the facility and duration. Please check our pricing page on the website for detailed information.",
  },
]

function findRelevantResponse(message: string): string | null {
  const lowercaseMessage = message.toLowerCase()
  for (const item of knowledgeBase) {
    if (item.keywords.some((keyword) => lowercaseMessage.includes(keyword))) {
      return item.response
    }
  }
  return null
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1].content

    // Check if we have a relevant response in our knowledge base
    const knowledgeBaseResponse = findRelevantResponse(lastMessage)
    if (knowledgeBaseResponse) {
      return NextResponse.json({ output: knowledgeBaseResponse })
    }

    // If no matching response in knowledge base, use Hugging Face API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: lastMessage }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("API Response Data:", data) // Log the response for debugging

    if (!data || !Array.isArray(data) || data.length === 0 || !data[0].generated_text) {
      throw new Error("No response generated")
    }

    return NextResponse.json({ output: data[0].generated_text })
  } catch (error: any) {
    console.error("Chat API Error:", error)

    if (error.status === 429) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    if (error.status === 401) {
      return NextResponse.json({ error: "Invalid API key. Please check your configuration." }, { status: 401 })
    }

    return NextResponse.json({ error: "An error occurred while processing your request" }, { status: 500 })
  }
}

