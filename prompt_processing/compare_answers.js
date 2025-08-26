import { GoogleGenAI } from "@google/genai";
import JSON5 from "json5";

async function CompareAnswers(input) {
  const prompt = input;
  const ai = new GoogleGenAI({
    apiKey: "AIzaSyDp7tmz_51cVkCNW0dh3ey3KBAxwCGPB8M",
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const answer = response.text;
  return answer;
}
export default CompareAnswers;
