import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface TrainingData {
  text: string
  category: string
}

export async function trainAI(data: TrainingData) {
  try {
    const { data: insertedData, error } = await supabase
      .from("ai_training_data")
      .insert([
        {
          category: data.category,
          text: data.text,
        },
      ])
      .select()

    if (error) {
      throw error
    }

    if (!insertedData || insertedData.length === 0) {
      throw new Error("No data was inserted")
    }

    console.log("AI training data updated successfully:", insertedData)
    return insertedData[0]
  } catch (error) {
    console.error("Error updating AI training data:", error)
    throw error
  }
}

