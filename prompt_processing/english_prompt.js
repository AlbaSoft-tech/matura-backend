import { GoogleGenAI } from "@google/genai";

async function Answer(input) {


  const apiKey = "AIzaSyDp7tmz_51cVkCNW0dh3ey3KBAxwCGPB8M";
  console.log(apiKey);

  if (!apiKey) {
    throw new Error("API key is missing.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: input,
    });

    const finalAnswer = response.candidates[0].content.parts[0].text

    return finalAnswer;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

export default Answer;
