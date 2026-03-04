// models/focusSession.model.js

import mongoose from "mongoose";

const focusSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

// Compound index for fast per-user per-date queries
focusSessionSchema.index({ userId: 1, date: 1 });

export default mongoose.model("FocusSession", focusSessionSchema);