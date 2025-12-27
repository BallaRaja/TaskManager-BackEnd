import TaskList from "../models/TaskList.js";

/**
 * @desc    Get all task lists for a specific user
 * @route   GET /api/tasklists/:userId
 * @access  Public (or make protected later)
 */
export const getTaskListsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const taskLists = await TaskList.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: taskLists.length,
      data: taskLists,
    });
  } catch (error) {
    console.error("[GET TASKLISTS BY USERID ERROR]", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc    Create a new task list
 * @route   POST /api/tasklists
 * @access  Private
 */
export const createTaskList = async (req, res) => {
  try {
    const userId = req.user.userId; // from auth middleware

    const { title, taskIds = [], isDefault = false } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Optional: Prevent multiple default lists
    if (isDefault) {
      await TaskList.updateMany({ userId, isDefault: true }, { isDefault: false });
    }

    const taskList = await TaskList.create({
      userId,
      title: title.trim(),
      taskIds,
      isDefault,
    });

    res.status(201).json({
      success: true,
      data: taskList,
    });
  } catch (error) {
    console.error("[CREATE TASKLIST ERROR]", error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Update a task list
 * @route   PUT /api/tasklists/:id
 * @access  Private
 */
export const updateTaskList = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const updates = req.body;

    // If setting isDefault to true, unset others
    if (updates.isDefault === true) {
      await TaskList.updateMany({ userId, isDefault: true }, { isDefault: false });
    }

    const taskList = await TaskList.findOneAndUpdate(
      { _id: id, userId }, // ownership check
      updates,
      { new: true, runValidators: true }
    );

    if (!taskList) {
      return res.status(404).json({ message: "Task list not found or unauthorized" });
    }

    res.status(200).json({
      success: true,
      data: taskList,
    });
  } catch (error) {
    console.error("[UPDATE TASKLIST ERROR]", error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Delete a task list
 * @route   DELETE /api/tasklists/:id
 * @access  Private
 */
export const deleteTaskList = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const taskList = await TaskList.findOneAndDelete({ _id: id, userId });

    if (!taskList) {
      return res.status(404).json({ message: "Task list not found or unauthorized" });
    }

    // Optional: If it was default, you might want to set another as default
    // Or ensure "My Tasks" always exists — handle in frontend or separate logic

    res.status(200).json({
      success: true,
      message: "Task list deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE TASKLIST ERROR]", error);
    res.status(500).json({ message: "Server error" });
  }
};