import finalising from "../prompt_processing/second_prompt.js"
import refining from "../prompt_processing/first_prompt.js";
import express from "express";

const router = express.Router();
const API_KEY = process.env.VISION_API

router.post("/answer", async (req, res) => {
 const { images } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ message: "No images provided." });
  }
  console.log(images)
  try {
    const ocrResults = await Promise.all(
      images.map(async (base64) => {
        const response = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [
                {
                  image: { content: base64 },
                  features: [{ type: 'TEXT_DETECTION' }],
                },
              ],
            }),
          }
        );

        const data = await response.json();
        return data.responses?.[0]?.fullTextAnnotation?.text || '';
      })
    );

    const prompt = ocrResults.join('\n\n');

    if (!prompt.trim()) {
      return res.status(400).json({ message: "No prompt!" });
    }

    const firstStep = await refining(prompt);
    const answer = await finalising(firstStep);

    res.status(201).json({ answer });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



export default router;
