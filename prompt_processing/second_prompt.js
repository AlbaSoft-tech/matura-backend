import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent folder
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { GoogleGenAI } from "@google/genai";
import refining from "./first_prompt.js";
import JSON5 from "json5";
import { text } from "stream/consumers";

async function finalising(input, language) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API,
  });
  const prompt =
    "you will be given a text(optionaly), some extra information and question/s. All the answers that can be answered purely from the text, answer them from the text. If you are not 100% sure you can answer from the extra information, and if you are not 100% sure from there too, find as much information on the internet and answer the left overs. Add an index before each question and answer them shortly and precise.Answer them in " +
    language +
    " in full sentences without saying things like 'based on the text' or referencing the source. Add each answer on a new line." +
    "\n";
  const first_prompt = input;
  const topic = first_prompt.nameOfLiteraryWork;
  const ragged = [];

  for (const question of first_prompt.questions) {
    const data = topic + " " + question;
    let response;
    let attempts = 0;
    const maxRetries = 5;

    while (attempts < maxRetries) {
      try {
        response = await fetch(process.env.MICROSERVICE + "/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, language }),
        });
        const result = await response.json();
        if (response.ok) {
          ragged.push(result);
          break;
        }
        console.log("Server error:", result.message);
      } catch (error) {
        console.error("Fetch error:", error);
      }
      attempts++;
    }
  }
  let uniqueContents = new Set();
  let destructured = [];

  console.log(ragged);

  for (let i = 0; i < ragged.length; ++i) {
    if (!ragged[i] || !ragged[i].result) continue;

    for (let j = 0; j < ragged[i].result.length; ++j) {
      const item = ragged[i].result[j];
      if (!item || !item.content) continue;

      const content = item.content;

      if (!uniqueContents.has(content)) {
        uniqueContents.add(content);
        destructured.push(content);
      }
    }
  }

  let extraInfo = "";
  for (let i = 0; i < destructured.length; ++i) {
    extraInfo += destructured[i] + "\n";
  }

  console.log(extraInfo);

  const finalPrompt =
    prompt +
    "title: " +
    first_prompt.nameOfLiteraryWork +
    "\n" +
    "text: " +
    first_prompt.text +
    "\n" +
    "questions: " +
    first_prompt.questions +
    "\n" +
    "extra information: " +
    destructured;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: finalPrompt,
  });

  const output = response.candidates[0].content.parts[0].text;

  function cleanText(text) {
    return text
      .replace(/[\[\]\"\'\(\)\-\*]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
  }

  const cleanedText = cleanText(output);

  return cleanedText;
} 

export default finalising;
