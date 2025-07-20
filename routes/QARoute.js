import express from "express";
import finalising from "../prompt_processing/second_prompt.js";
import refining from "../prompt_processing/first_prompt.js";
import Answer from "../prompt_processing/english_prompt.js";
import CompareAnswers from "../prompt_processing/compare_answers.js";
import User from "../models/user.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const API_KEY = process.env.VISION_API;

router.post("/answer", async (req, res) => {
  const { prompt, type } = req.body;

  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];
    console.log(token);
    console.log("token recieved decoding email");
    console.log(process.env.JWT_SECRET);
    let decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded token: ", decoded);
    const email = decoded.email;
    console.log("user id decoded: ", decoded._id);
    console.log("email decoded: ", email);
    if (!prompt) {
      return res.status(400).json({ message: "No prompt!" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log("user found");
    if (type === "photo") {
      if (user.tokens < 10) {
        return res.status(403).json({ message: "Not enough tokens" });
      }
      let answer;
      const firstStep = await refining(prompt);
      if (firstStep.language.toLowerCase() !== "english") {
        answer = await finalising(firstStep, firstStep.language.toLowerCase());
      } else {
        answer = await Answer(prompt);
      }

      user.tokens -= 10;
      await user.save();

      return res.status(201).json({ answer });
    } else {
      if (user.tokens < 0.5) {
        return res.status(403).json({ message: "Not enough tokens" });
      }
      let answer;
      const firstStep = await refining(prompt);

      if (firstStep.valid === false) {
        return res.status(400).json({ message: "Invalid prompt" });
      }

      if (firstStep.language.toLowerCase() !== "english") {
        answer = await finalising(firstStep, firstStep.language.toLowerCase());
      } else {
        answer = await Answer(prompt);
      }

      user.tokens -= 0.5;
      await user.save();

      return res.status(201).json({ answer });
    }
  } catch (error) {
    console.error("Error in /answer route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
/*
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
*/

router.post("/compare-answers", async (req, res) => {
  const { prompt, index, language } = req.body;
  console.log(index, language);

  try {
    if (typeof prompt !== "string" || prompt.trim() === "") {
      console.log("Backend - Error: Invalid or empty prompt.");
      return res
        .status(400)
        .json({ message: "Invalid or empty prompt provided." });
    }
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      typeof language !== "string" ||
      language.trim() === ""
    ) {
      console.log(
        "Backend - Error: Invalid 'index' or 'language' parameters. Index:",
        index,
        "Language:",
        language
      );
      return res
        .status(400)
        .json({ message: "Invalid 'index' or 'language' parameters." });
    }
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }
    console.log("everything needed");
    const token = authHeader.split(" ")[1];
    console.log(token);
    let decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.testUnlocked === false) {
      return res.status(403).json({ message: "Test not unlocked" });
    }
    console.log("user found");

    if (user.checkTestTokens < 1) {
      return res.status(403).json({ message: "abused test tokens" });
    }
    const answer = await CompareAnswers(prompt);
    console.log(answer);
    user.checkTestTokens -= 1;
    user.completedTests[language.toLowerCase()].push(index);
    await user.save();
    res.status(201).json({ answer });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
