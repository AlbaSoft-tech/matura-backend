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
app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/processing", QARoute);

app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
  connectDB();
});
