import express from "express";
import finalising from "../prompt_processing/second_prompt.js";
import refining from "../prompt_processing/first_prompt.js";
import Answer from "../prompt_processing/english_prompt.js";
import CompareAnswers from "../prompt_processing/compare_answers.js";
import User from "../models/user.js";

const router = express.Router();
const API_KEY = process.env.VISION_API;

router.post("/answer", async (req, res) => {
  const { prompt, type, email, language } = req.body;

  try {
    if (!prompt) {
      return res.status(400).json({ message: "No prompt!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (type === "photo") {
      if (user.tokens < 10) {
        return res.status(403).json({ message: "Not enough tokens" });
      }

      const firstStep = await refining(prompt);
      const answer = await finalising(firstStep, language);

      user.tokens -= 10;
      await user.save();

      return res.status(201).json({ answer });
    } else {
      if (user.tokens < 1) {
        return res.status(403).json({ message: "Not enough tokens" });
      }

      const firstStep = await refining(prompt);
      const answer = await finalising(firstStep, language);

      user.tokens -= 1;
      await user.save();

      return res.status(201).json({ answer });
    }
  } catch (error) {
    console.error("Error in /answer route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/english", async (req, res) => {
  const { prompt, type, email } = req.body;

  try {
    if (!prompt) {
      return res.status(400).json({ message: "No prompt!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (type === "photo") {
      if (user.tokens < 10) {
        return res.status(403).json({ message: "Not enough tokens" });
      }

      const answer = await Answer(prompt);

      user.tokens -= 10;
      await user.save();

      return res.status(201).json({ answer });
    } else {
      if (user.tokens < 1) {
        return res.status(403).json({ message: "Not enough tokens" });
      }

      const answer = await Answer(prompt);

      user.tokens -= 1;
      await user.save();

      return res.status(201).json({ answer });
    }
  } catch (error) {
    console.error("Error in /answer route:", error);
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
