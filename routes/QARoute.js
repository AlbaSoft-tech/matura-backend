import express from "express";
import finalising from "../prompt_processing/second_prompt.js";
import refining from "../prompt_processing/first_prompt.js";
import Answer from "../prompt_processing/english_prompt.js";
import CompareAnswers from "../prompt_processing/compare_answers.js";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import countTokens from "../prompt_processing/tokenizer.js";

const router = express.Router();
const API_KEY = process.env.VISION_API;

router.post("/answer", async (req, res) => {
  const { prompt, type } = req.body;
  const tokenCount = countTokens(prompt);
  if (tokenCount > 10000) {
    return res
      .status(400)
      .json({ message: "Prompt is too long, maximum 10000 tokens allowed." });
  }
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
      if (user.tokens < 3) {
        return res.status(403).json({ message: "Not enough tokens" });
      }
      let answer;
      const firstStep = await refining(prompt);
      if (firstStep.language.toLowerCase() !== "english") {
        answer = await finalising(firstStep, firstStep.language.toLowerCase());
      } else {
        answer = await Answer(prompt);
      }

      user.tokens -= 3;
      await user.save();

      return res.status(201).json({ answer });
    } else {
      if (user.tokens < 1) {
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

      user.tokens -= 1;
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
  const tokenCount = countTokens(prompt);
  if (tokenCount > 10000) {
    return res
      .status(400)
      .json({ message: "Prompt is too long, maximum 10000 tokens allowed." });
  }

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
    if (user.tokens < 1) {
      return res.status(403).json({ message: "Not enough tokens" });
    }
    console.log("user found");
    const answer = await CompareAnswers(prompt);
    console.log(answer);
    user.tokens -= 1;
    const langKey = language.toLowerCase();
    if (!user.completedTests || typeof user.completedTests !== "object") {
      user.completedTests = {};
      console.log(
        "Backend: user.completedTests was null/undefined, initialized to {}."
      );
    }
    if (
      !user.completedTests[langKey] ||
      !Array.isArray(user.completedTests[langKey])
    ) {
      user.completedTests[langKey] = [];
      console.log(
        `Backend: user.completedTests['${langKey}'] was null/undefined/not an array, initialized to [].`
      );
    }
    if (!user.completedTests[langKey].includes(index)) {
      user.completedTests[langKey] = [...user.completedTests[langKey], index];
      user.markModified("completedTests");

      console.log(
        `Backend: Added index ${index} to completedTests for '${langKey}'. Tokens decremented.`
      );
    } else {
      console.log(
        `Backend: Test ${index} for '${langKey}' is already completed. No changes made.`
      );
    }
    await user.save();
    console.log("Backend: User document saved successfully to database.");

    res.status(201).json({ answer });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
