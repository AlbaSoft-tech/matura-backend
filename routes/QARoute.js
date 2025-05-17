import finalising from "../prompt_processing/second_prompt.js"
import refining from "../prompt_processing/first_prompt.js";

import express from "express";

const router = express.Router();

router.post("/answer", async (req, res) => {
  try {

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "No prompt!" });
    }

    const firstStep = await refining(prompt.question)
    
    const answer = await finalising(firstStep)

    
    res.status(201).json({
      answer: answer
    
    });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



export default router;
