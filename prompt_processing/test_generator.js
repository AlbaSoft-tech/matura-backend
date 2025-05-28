import { GoogleGenAI } from "@google/genai";
import JSON5 from "json5";
import fs from "fs/promises";

async function testGeneration() {
  const prompt = ` 
Create a reading comprehension test in b1 level that includes the following sections:

Text Matching (A–D): Provide four short texts labeled A, B, C, and D. Each should 
cover a different topic or point of view. Then include 4–5 questions. Each question 
should ask something like "In which text...?" and the answer should be A, B, C, or D.

Paragraph Ordering: Write a short article divided into five paragraphs labeled A–E. 
Shuffle them randomly, and ask the user to put the paragraphs in the correct logical order (1–5).

Multiple Choice: Provide a medium-length reading passage (300–500 words). 
Then write 5 multiple-choice questions about the text, each with 4 answer options (A–D), with only one correct answer.

Matching Headings to Paragraphs: Provide a text split into 5 paragraphs labeled 1–5. 
Then list 8 possible headings labeled A–H. The user must match each paragraph to the best-fitting heading. Three headings should not be used.

One-Word Fill in the Blank (Cloze):
Create a short passage (around 100–150 words) with 10 missing words.
Each blank should be filled with only one word. Provide the answers at the end.

Word Formation Exercise:
Complete the sentence by changing the word given in brackets into the correct form so that it fits the meaning of the sentence.

All of the sections must contain long paragraphs or texts.

below is an example of the json format you should return but do not use the examples below to generate new ones generate a unique one each time: 

[
  {
    type: "text_matching",
    instructions: "",
    texts: {
      A: "Text A content about the environment...",
      B: "Text B discussing technology...",
      C: "Text C explaining history...",
      D: "Text D focused on art..."
    },
    questions: [
      {
        question: "Which text discusses the impact of AI on daily life?",
        options: ["A", "B", "C", "D"],
        answer: "B"
      }
    ]
  },
  {
    type: "paragraph_ordering",
    instructions: "",
    shuffledParagraphs: {
      A: "First he packed his suitcase.",
      B: "Finally, he left for the airport.",
      C: "Then he checked his documents.",
      D: "Next, he called a taxi.",
      E: "Before that, he locked the door."
    },
    correctOrder: ["A", "C", "D", "E", "B"]
  },
  {
    type: "multiple_choice",
    instructions: "",
    text: "Climate change is caused by various human activities, including the burning of fossil fuels and deforestation...",
    questions: [
      {
        question: "What is a major contributor to climate change?",
        options: {
          A: "Using electric cars",
          B: "Burning fossil fuels",
          C: "Planting trees",
          D: "Recycling plastic"
        },
        answer: "B"
      }
    ]
  },
{
  "type": "matching_headings",
  "instruction": "",
  "paragraphs": {
    "1": "This paragraph is about daily routines...",
    "2": "This one focuses on diet and nutrition...",
    "3": "Here we discuss mental health...",
    "4": "Exercise and its benefits...",
    "5": "Sleep patterns and rest habits..."
  },
  "headings": {
    "A": "Healthy Food Choices",
    "B": "The Role of Sleep",
    "C": "Physical Fitness",
    "D": "Daily Habits",
    "E": "Emotional Well-being",
    "F": "Learning Strategies",
    "G": "Social Media Effects",
    "H": "Time Management"
  },
  "answers": {
    "1": "D",
    "2": "A",
    "3": "E",
    "4": "C",
    "5": "B"
  }
},
{
  "type": "fill_in_the_blank",
  "instruction": "",
  "text": "You may have been told that the amount of sleep that you need decreases (1) ____________ you get older, but this is not the case. All adults require eight hours of sleep (2) ____________ night.",
  "answers": {
    "1": "as",
    "2": "each"
  }
},
  {
  "type": "word_formation",
  "instructions": "",
  "examples": [
    {
      "sentence": "She received a __________ to study abroad. (scholar)",
      "answer": "scholarship"
    }
],}
];`;
  const ai = new GoogleGenAI({
    apiKey: "AIzaSyDp7tmz_51cVkCNW0dh3ey3KBAxwCGPB8M",
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const answer = response.text;
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found.");
  }

  const jsonStr = answer.slice(start, end + 1);

  const finalAnswer = JSON5.parse(jsonStr);
  return finalAnswer;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateExercises() {
  const exercises = [];
  let counter = 0;

  for (let i = 0; i <= 100; i++) {
    // change 100 with how many tests y ou want to generate
    if (counter === 10) {
      console.log("Waiting for Gemini limits...");
      await delay(60000);
      counter = 0;
    }

    const exercise = await testGeneration();
    exercises.push(exercise);
    counter++;
  }

  fs.writeFile(
    "englishTests.json",
    JSON.stringify(exercises, null, 2),
    (err) => {
      if (err) {
        console.error("Error writing file:", err);
      } else {
        console.log("exercises.json has been saved!");
      }
    }
  );
}

generateExercises();

export default testGeneration;
