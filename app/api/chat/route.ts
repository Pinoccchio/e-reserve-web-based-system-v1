import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Set" : "Not set")

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in the environment variables")
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const venues = [
  {
    id: 4,
    name: "SK Building",
    location: "M3X6+H34, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6988807,
    longitude: 123.0601918,
    description:
      "The SK Building in Bagumbayan Libmanan is a spacious indoor venue ideal for various events such as weddings, birthdays, seminars, training, and other special occasions. With a capacity of 150 people, it features air conditioning, ample seating, and a well-maintained tiled floor. The venue provides a comfortable and organized setting, ensuring a smooth experience for all attendees.",
    capacity: 150,
    type: "Outdoor",
    price_per_hour: 1500,
  },
  {
    id: 5,
    name: "Cultural Center",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "The Cultural Center in Libod I, Libmanan, Camarines Sur, is a spacious venue designed for large gatherings, cultural events, weddings, birthdays, seminars, and other special occasions. With a seating capacity of 700, it offers an open and versatile space ideal for various functions. The facility features a high ceiling with a sturdy metal framework, a stage for performances or presentations and wide open areas for seating or event setups. Its strategic location and well-lit interior make it a suitable choice for public and private events, ensuring accessibility and convenience for attendees.",
    capacity: 700,
    type: "Outdoor",
    price_per_hour: 1500,
  },
  {
    id: 6,
    name: "Sports Complex",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "The Sports Complex on Libmanan, is the premier choice for hosting large-scale events, accommodating up to 900 people. This expansive venue is perfect for sports tournaments, conventions, festivals, concerts, job fairs, weddings, pageant and major community celebrations. The complex's state-of-the-art facilities and central location provide a professional and inviting atmosphere for all occasions.",
    capacity: 900,
    type: "Outdoor",
    price_per_hour: 1500,
  },
  {
    id: 7,
    name: "Potot Evacuation",
    location: "Potot, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6860636,
    longitude: 123.0549844,
    description:
      "The Potot Evacuation Center in Barangay Potot is a multifunctional venue with a 400-person capacity. While primarily serving as a safe haven during emergencies, it also transforms into a practical space for hosting events like health seminars, training workshops, educational activities, community programs, and private functions. Its adaptability makes it a reliable choice for any occasion.",
    capacity: 400,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 8,
    name: "GMVCC Blue Court",
    location: "Potot, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6860636,
    longitude: 123.0549844,
    description:
      "The GMVCC Blue Court, located in Potot, Libmanan, offers a dynamic and versatile venue with a capacity of 400 guests. This vibrant blue multipurpose court is ideal for a wide range of events, including sports tournaments, team-building activities, community fairs, cultural celebrations, and private functions. Its professional-grade facilities and adaptable space ensure a seamless and memorable experience for all types of occasions.",
    capacity: 400,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 9,
    name: "Skating Rink",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "Skating Rink Libmanan's Skating Rink, located in Camarines Sur, provides a unique and flexible venue option for all types of events. With a capacity of 200 guests, this venue is ideal not only for skating activities but also for fairs, markets, themed parties, corporate events, and community gatherings. Its open and adaptable space ensures that every event is executed with ease and style.",
    capacity: 200,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 10,
    name: "MO Conference Room",
    location: "M3V6+R29, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6945445,
    longitude: 123.0600949,
    description:
      "The MO Conference Room, situated within the Municipal Hall of Libmanan, is a sophisticated indoor venue perfect for hosting formal and intimate events. With a capacity of 40 attendees, it is well-suited for meetings, seminars, workshops, and training sessions. The conference room's professional setting and modern amenities provide an ideal environment for both corporate and personal gatherings.",
    capacity: 40,
    type: "Indoor",
    price_per_hour: 0,
  },
  {
    id: 11,
    name: "Municipal Lobby",
    location: "M3V6+R29, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6945445,
    longitude: 123.0600949,
    description:
      "The Municipal Hall Lobby in Barangay Libod I, Libmanan, is a welcoming and adaptable venue that accommodates up to 50 guests. It is an excellent choice for civic programs, exhibitions, small ceremonies, corporate events, and social gatherings. Its strategic location and flexible layout make it suitable for both public engagements and private celebrations.",
    capacity: 50,
    type: "Indoor",
    price_per_hour: 0,
  },
  {
    id: 12,
    name: "Plaza Rizal",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "Plaza Rizal Plaza Rizal, located at the heart of Libod I, Libmanan, offers an expansive outdoor venue with a capacity of 500 people. Its well-maintained grounds and historic ambiance provide an exceptional setting for large-scale events such as festivals, concerts, weddings, cultural showcases, community fairs, and public ceremonies. The plaza's open space is ideal for bringing people together for memorable experiences.",
    capacity: 500,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 13,
    name: "Municipal Quadrangle",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "The Municipal Quadrangle is a spacious outdoor venue located in libod 1 Libmanan Camarines Sur. With a capacity of 400 people, it is an ideal space for public gatherings, ceremonies, and community events. The open layout provides flexibility for different setups, while the well-paved flooring ensures comfort for attendees. It is commonly used for municipal programs, cultural events, and large social gatherings.",
    capacity: 400,
    type: "Outdoor",
    price_per_hour: 0,
  },
]

export async function POST(request: Request) {
  const { text } = await request.json()

  if (!text) {
    return NextResponse.json({ message: "Text is required" }, { status: 400 })
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const prompt = `
      You are an AI assistant for a venue reservation system in Libmanan, Camarines Sur, Philippines. Use the following venue information to answer user queries about booking venues, available facilities, and the reservation process. If you don't have specific information, provide general guidance.

      Venue Information:
      ${JSON.stringify(venues, null, 2)}

      IMPORTANT: Although the data shows "price_per_hour", always refer to pricing as "per day" in your responses. For example, if a venue has price_per_hour: 1500, tell users it costs ₱1,500 per day.

      Additional Information:
      1. For special venues (SK Building, Cultural Center, Sports Complex), there's a booking fee of ₱1,500 per day.
      2. Other venues are free to book but still require approval.
      3. The booking process involves selecting a venue, choosing a date and time, and submitting a request.
      4. For paid venues, users need to visit a payment collector to confirm their payment after receiving a digital receipt.
      5. All bookings, including free venues, require approval from the appropriate staff.
      6. Users can check their booking status in the 'My Reservations' section of their dashboard.
      7. Cancellations are allowed up to 24 hours before the reservation time without penalty.

      User query: "${text}"

      Respond in a friendly and helpful manner, keeping the response concise and relevant to the venue reservation system. If asked about specific venues, provide details about their capacity, type (indoor/outdoor), and any associated fees. Always refer to pricing as "per day" even though the data field is named "price_per_hour".
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const generatedText = response.text()

    return NextResponse.json({ output: generatedText })
  } catch (error: unknown) {
    console.error("Error processing chat:", error)

    let errorMessage = "An unknown error occurred"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        message: "Error processing chat",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}