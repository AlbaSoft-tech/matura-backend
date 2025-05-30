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
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:8081",
        "http://localhost:5173",
        "https://matura-mk-pi.vercel.app/",
      ];

      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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
