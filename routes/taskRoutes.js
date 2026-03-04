import express from "express";
import {
  getTasks,
  getTasksByUserId,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Task from "../models/Task.js"; // ← ADD THIS (adjust path if your file is named differently)

const router = express.Router();

// ===============================================
// PUBLIC ROUTE
// ===============================================
router.get("/:userId", getTasksByUserId);

// ===============================================
// PROTECTED ROUTES (Require Authentication)
// ===============================================
router.use(authMiddleware);

router.get("/", getTasks);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

// PATCH /api/tasks/:id/status  ← Kanban status update
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { status },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;