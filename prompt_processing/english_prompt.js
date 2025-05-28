import { GoogleGenAI } from "@google/genai";

async function Answer(input) {
  const prompt = input;

  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("API key is missing.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  try {

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });


    const finalAnswer = response.data;

    return finalAnswer;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

export default Answer;
