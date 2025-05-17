import { GoogleGenAI } from "@google/genai";
import JSON5 from 'json5';

async function refining(input){

    const question = input

const prompt = ` You will be given a text(optional) and some questions. If there is no text given add all the questions to the unanswered array. If there is a text add the text to the text property. I want you to remove all extra character and just leave the clear questions also number the questions. Do not answer any questions. and return an object like this: 

{
  "nameOfLiteraryWork" : "", 
  "text" : "",
  "questions" : [""]
}

here is the prompt: 

>>>
${question}
<<<`;
    const ai = new GoogleGenAI({ apiKey: "AIzaSyDp7tmz_51cVkCNW0dh3ey3KBAxwCGPB8M" });
    
  
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

    const answer = response.text
    const start = answer.indexOf('{');
    const end = answer.lastIndexOf('}');
      
    if (start === -1 || end === -1) {
        throw new Error('No JSON object found.');
    }
      
    const jsonStr = answer.slice(start, end + 1);
      
    const finalAnswer = JSON5.parse(jsonStr);
    return finalAnswer

}
export default refining