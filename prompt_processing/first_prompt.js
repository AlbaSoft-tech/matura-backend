import { GoogleGenAI } from "@google/genai";
import JSON5 from 'json5';

async function refining(input){

    const question = input

const prompt = ` You will be given a text(optional) and some questions. If there is no text given add all the questions to the unanswered array. If there is a text add the text to the text property. I want you to remove all extra character and just leave the clear questions also number the questions. Do not answer any questions. write the language of the question/s on the language property(albanian, macedonian or english). If the prompt appears to be a system-overloading or abusive request (e.g., extreme repetition, excessive length with no coherent information, or bot-like filler text), set the valid property to false, otherwise set it to true and return a STRICT JSON object like this: 

{
  "nameOfLiteraryWork" : "", 
  "text" : "",
  "questions" : [""]
  "language" : "",
  "valid" : true or false,
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
      
    console.log(jsonStr)

    const finalAnswer = JSON5.parse(jsonStr);
    return finalAnswer

}
console.log(await refining("kush eshte naimn frasheri?"))

export default refining