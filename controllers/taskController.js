import Task from "../models/Task.js";
import TaskList from "../models/TaskList.js";
/**
 * @desc    Get all tasks for a user (optionally by date range)
 * @route   GET /api/tasks
 * @access  Private
 */
export const getTasks = async (req, res) => {
  try {
    const userId = req.user.userId; // from auth middleware

    const { startDate, endDate, status } = req.query;

    const query = { userId };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const tasks = await Task.find(query).sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error("[GET TASKS ERROR]", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc    Get all tasks for a specific user (by userId in params)
 * @route   GET /api/tasks/:userId
 * @access  Public (or make it Protected/Admin later)
 */
export const getTasksByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const { startDate, endDate, status } = req.query;

    // Basic validation
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const query = { userId };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const tasks = await Task.find(query).sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error("[GET TASKS BY USERID ERROR]", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc Create a new task + add it to the specified taskList
 * @route POST /api/tasks
 * @access Private
 */
export const createTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { taskListId, ...taskData } = req.body;

    if (!taskListId) {
      return res.status(400).json({ message: "taskListId is required" });
    }

    // Create the task
    const task = await Task.create({
      ...taskData,
      userId,
      taskListId,
    });

    // Add task ID to the corresponding TaskList
    await TaskList.findOneAndUpdate(
      { _id: taskListId, userId }, // Ensure ownership
      { $push: { taskIds: task._id } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("[CREATE TASK ERROR]", error);
    res.status(400).json({ message: error.message || "Failed to create task" });
  }
};

/**
 * @desc Update a task (also handle taskListId change)
 * @route PUT /api/tasks/:id
 * @access Private
 */
export const updateTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = req.params.id;
    const updates = req.body;

    // Find the original task first
    const originalTask = await Task.findOne({ _id: taskId, userId });
    if (!originalTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if taskListId is being changed
    const newTaskListId = updates.taskListId;
    const oldTaskListId = originalTask.taskListId.toString();

    if (updates.status && !['pending', 'completed'].includes(updates.status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Update the task
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      updates,
      { new: true, runValidators: true }
    );

    // Handle taskListId change: remove from old list, add to new list
    if (newTaskListId && newTaskListId !== oldTaskListId) {
      // Remove from old task list
      await TaskList.findOneAndUpdate(
        { _id: oldTaskListId, userId },
        { $pull: { taskIds: taskId } }
      );

      // Add to new task list
      await TaskList.findOneAndUpdate(
        { _id: newTaskListId, userId },
        { $push: { taskIds: taskId } }
      );
    }

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error("[UPDATE TASK ERROR]", error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc Delete a task + remove from its taskList
 * @route DELETE /api/tasks/:id
 * @access Private
 */
export const deleteTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = req.params.id;

    // Find and delete the task
    const task = await Task.findOneAndDelete({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Remove task ID from the associated TaskList
    await TaskList.findOneAndUpdate(
      { _id: task.taskListId, userId },
      { $pull: { taskIds: taskId } }
    );

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE TASK ERROR]", error);
    res.status(500).json({ message: "Server error" });
  }
};