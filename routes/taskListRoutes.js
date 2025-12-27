import express from "express";
import {
  getTaskListsByUserId,
  createTaskList,
  updateTaskList,
  deleteTaskList,
} from "../controllers/taskListController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route: Get task lists by userId
router.get("/:userId", getTaskListsByUserId);

// Protected routes: Only authenticated user can create/update/delete their own lists
router.use(authMiddleware);

router.post("/", createTaskList);
router.put("/:id", updateTaskList);
router.delete("/:id", deleteTaskList);

export default router;