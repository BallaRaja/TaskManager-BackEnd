import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import taskListRoutes from "./routes/taskListRoutes.js";


const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

//Routes here
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/taskList", taskListRoutes);

// Health check route (VERY IMPORTANT)
app.get("/", (req, res) => {
  res.send("Server is awake 🚀");
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
