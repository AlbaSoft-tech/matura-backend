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
    const langKey = language.toLowerCase();

    // Ensure user.completedTests exists and is an object (for robustness with old user data)
    // This handles cases where older user documents might not have this field,
    // or if it was somehow set to null/undefined.
    if (!user.completedTests || typeof user.completedTests !== "object") {
      user.completedTests = {};
      console.log(
        "Backend: user.completedTests was null/undefined, initialized to {}."
      );
    }

    // Ensure the specific language array exists and is an array (for robustness)
    // This handles cases where the main completedTests object exists, but a specific
    // language array within it might be missing (e.g., if a new language is added
    // to the schema default after existing users were created).
    if (
      !user.completedTests[langKey] ||
      !Array.isArray(user.completedTests[langKey])
    ) {
      user.completedTests[langKey] = [];
      console.log(
        `Backend: user.completedTests['${langKey}'] was null/undefined/not an array, initialized to [].`
      );
    }

    // Only add the index if it's not already present in the array to prevent duplicates.
    if (!user.completedTests[langKey].includes(index)) {
      // Use the spread operator to create a new array instance, maintaining immutability.
      user.completedTests[langKey] = [...user.completedTests[langKey], index];

      // Decrement test tokens only when a new, uncompleted test is added.
      user.checkTestTokens -= 1;

      // IMPORTANT: Tell Mongoose that the 'completedTests' path (which is a Mixed type/Object)
      // has been modified. This is crucial for Mongoose to detect changes to nested properties
      // and persist them to the database.
      user.markModified("completedTests");

      console.log(
        `Backend: Added index ${index} to completedTests for '${langKey}'. Tokens decremented.`
      );
    } else {
      console.log(
        `Backend: Test ${index} for '${langKey}' is already completed. No changes made.`
      );
      // You might consider returning a different status here (e.g., 200 OK)
      // if the test was already completed, to avoid unnecessary save operations
      // and signal to the frontend that nothing new was added.
      // For example:
      // return res.status(200).json({ message: "Quiz already completed", answer });
    }

    // Crucial: Save the user document to persist all changes (tokens, completedTests) to the database.
    await user.save();
    console.log("Backend: User document saved successfully to database.");

    // Send the success response to the frontend.
    res.status(201).json({ answer });
  } catch (error) {
    console.log("Error in answer route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
