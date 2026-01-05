import express from "express";
import {
  getTasks,
  getTasksByUserId,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ===============================================
// PUBLIC ROUTE
// ===============================================
// Allow anyone to view tasks of a user (e.g., for shared public profile)
// GET /api/tasks/:userId
router.get("/:userId", getTasksByUserId);

// ===============================================
// PROTECTED ROUTES (Require Authentication)
// ===============================================
router.use(authMiddleware);

// Get current user's tasks (filtered optionally by query params)
// GET /api/tasks?status=pending&startDate=...&endDate=...
router.get("/", getTasks);

// Create a new task (requires taskListId in body)
// POST /api/tasks
router.post("/", createTask);

// Update a task (can move to different taskListId)
// PUT /api/tasks/:id
router.put("/:id", updateTask);

// Delete a task (automatically removes from taskList)
// DELETE /api/tasks/:id
router.delete("/:id", deleteTask);

export default router;