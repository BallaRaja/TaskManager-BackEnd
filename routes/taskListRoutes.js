import express from "express";
import {
  getTaskListsByUserId,
  createTaskList,
  updateTaskList,
  deleteTaskList,
} from "../controllers/taskListController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ===============================================
// PUBLIC ROUTE
// ===============================================
// Allow viewing someone's task lists (useful for shared profiles)
// GET /api/tasklists/:userId
router.get("/:userId", getTaskListsByUserId);

// ===============================================
// PROTECTED ROUTES (Require Authentication)
// ===============================================
router.use(authMiddleware);

// These routes are for the authenticated user only
// POST /api/tasklists → create new list
router.post("/", createTaskList);

// PUT /api/tasklists/:id → update list (title, isDefault, etc.)
router.put("/:id", updateTaskList);

// DELETE /api/tasklists/:id → delete list (tasks remain, but unassigned? or handle separately)
router.delete("/:id", deleteTaskList);

export default router;