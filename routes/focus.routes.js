// routes/focus.routes.js

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  saveSession,
  getDailySummary,
  getWeeklyAnalytics,
} from "../controllers/focus.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/session", saveSession);      // POST  /api/focus/session
router.get("/daily", getDailySummary);     // GET   /api/focus/daily
router.get("/weekly", getWeeklyAnalytics); // GET   /api/focus/weekly

export default router;