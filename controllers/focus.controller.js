// controllers/focus.controller.js

import mongoose from "mongoose";
import FocusSession from "../models/focusSession.model.js";

// ── Helpers ──────────────────────────────────────────────────

const todayString = () => new Date().toISOString().slice(0, 10);

const lastSevenDays = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

// ── POST /api/focus/session ───────────────────────────────────

const saveSession = async (req, res) => {
  try {
    const { taskId, duration, date } = req.body;
    const userId = req.user.id;

    if (!taskId || !duration || !date) {
      return res.status(400).json({
        success: false,
        message: "taskId, duration, and date are required.",
      });
    }

    if (typeof duration !== "number" || duration < 1) {
      return res.status(400).json({
        success: false,
        message: "duration must be a positive number (minutes).",
      });
    }

    const session = await FocusSession.create({ userId, taskId, duration, date });

    return res.status(201).json({
      success: true,
      message: "Focus session saved.",
      data: session,
    });
  } catch (error) {
    console.error("[saveSession]", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Streak calculator ─────────────────────────────────────────

const calculateStreak = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const rows = await FocusSession.aggregate([
    { $match: { userId: uid } },
    { $group: { _id: "$date" } },
    { $sort: { _id: -1 } },
  ]);

  if (!rows.length) return 0;

  const today = todayString();
  let streak = 0;
  let expected = today;

  for (const row of rows) {
    if (row._id === expected) {
      streak++;
      const d = new Date(expected);
      d.setUTCDate(d.getUTCDate() - 1);
      expected = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }

  return streak;
};

// ── GET /api/focus/daily ──────────────────────────────────────

const getDailySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = todayString();
    const uid = new mongoose.Types.ObjectId(userId);

    const [result] = await FocusSession.aggregate([
      { $match: { userId: uid, date: today } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMinutes: { $sum: "$duration" },
        },
      },
      { $project: { _id: 0, totalSessions: 1, totalMinutes: 1 } },
    ]);

    const streak = await calculateStreak(userId);

    return res.status(200).json({
      success: true,
      data: {
        totalSessions: result?.totalSessions ?? 0,
        totalMinutes: result?.totalMinutes ?? 0,
        streak,
      },
    });
  } catch (error) {
    console.error("[getDailySummary]", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── GET /api/focus/weekly ─────────────────────────────────────

const getWeeklyAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = lastSevenDays();
    const startDate = days[0];
    const endDate = days[days.length - 1];

    const uid = new mongoose.Types.ObjectId(userId);

    const rows = await FocusSession.aggregate([
      {
        $match: {
          userId: uid,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$date",
          minutes: { $sum: "$duration" },
          sessions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", minutes: 1, sessions: 1 } },
    ]);

    const rowMap = Object.fromEntries(rows.map((r) => [r.date, r]));

    const dailyBreakdown = days.map((d) => ({
      date: d,
      minutes: rowMap[d]?.minutes ?? 0,
      sessions: rowMap[d]?.sessions ?? 0,
    }));

    const totalMinutes = dailyBreakdown.reduce((s, d) => s + d.minutes, 0);
    const totalSessions = dailyBreakdown.reduce((s, d) => s + d.sessions, 0);

    return res.status(200).json({
      success: true,
      data: { totalSessions, totalMinutes, dailyBreakdown },
    });
  } catch (error) {
    console.error("[getWeeklyAnalytics]", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ✅ ES Module exports
export { saveSession, getDailySummary, getWeeklyAnalytics };