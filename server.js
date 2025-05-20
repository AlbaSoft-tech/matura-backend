import express from "express";
import "dotenv/config";
import authRoutes from "./routes/authRoutes.js";
import { connectDB } from "./lib/db.js";
import cors from "cors";
import job from "./lib/cron.js";
import QARoute from "./routes/QARoute.js";

const app = express();
const PORT = process.env.PORT;

job.start();

// CORS setup
app.use(
  cors({
    origin: "http://localhost:8081",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Increase the body size limit to 10MB (adjust as needed)
app.use(express.json({ limit: "10mb" })); // For JSON payloads
app.use(express.urlencoded({ limit: "10mb", extended: true })); // For URL-encoded data

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/processing", QARoute);

// Start the server
app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
  connectDB();
});
