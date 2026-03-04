import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import taskListRoutes from "./routes/taskListRoutes.js";
import focusRoutes from "./routes/focus.routes.js"; // ✅ ES module import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// 🕒 Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: "Too many login/OTP attempts, please try again after an hour",
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/taskList", taskListRoutes);
app.use("/api/focus", focusRoutes); // ✅ focus routes

// Health check
app.get("/", (req, res) => {
  res.send("Server is awake 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});