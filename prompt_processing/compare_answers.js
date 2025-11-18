import { GoogleGenAI } from "@google/genai";
import JSON5 from "json5";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent folder
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function CompareAnswers(input) {
  const prompt = input;
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API,
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const answer = response.text;
  return answer;
}
export default CompareAnswers;