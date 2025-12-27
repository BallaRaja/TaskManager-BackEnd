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

// === Public / Shared Routes ===
router.get("/:userId", getTasksByUserId); // GET /api/tasks/694eee3de2f29c7c721d8050

// === Protected Routes (Authenticated User Only) ===
router.use(authMiddleware);

router.get("/", getTasks);        // GET /api/tasks → current user's tasks
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;