import express from "express";
import finalising from "../prompt_processing/second_prompt.js";
import refining from "../prompt_processing/first_prompt.js";
import Answer from "../prompt_processing/english_prompt.js";
import CompareAnswers from "../prompt_processing/compare_answers.js";

const router = express.Router();
const API_KEY = process.env.VISION_API;

router.post("/answer", async (req, res) => {
  const { prompt } = req.body;

  try {
    if (!prompt) {
      return res.status(400).json({ message: "No prompt!" });
    }
    console.log(prompt);
    const firstStep = await refining(prompt);

    const answer = await finalising(firstStep);
    console.log(answer);

    res.status(201).json({ answer });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/english", async (req, res) => {
  const { prompt } = req.body;
  console.log(prompt);

  try {
    if (!prompt) {
      return res.status(400).json({ message: "No prompt!" });
    }

    const answer = await Answer(prompt);

    console.log(answer);

    res.status(201).json({ answer });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/compare-answers", async (req, res) => {
  const { prompt } = req.body;
  console.log(prompt);

  try {
    if (!prompt) {
      return res.status(400).json({ message: "No prompt!" });
    }

    const answer = await CompareAnswers(prompt);

    console.log(answer);

    res.status(201).json({ answer });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
