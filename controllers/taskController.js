import Task from "../models/Task.js";

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
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
export const createTask = async (req, res) => {
  try {
    console.log("req.user =", req.user); // DEBUG

    const task = await Task.create({
      ...req.body,
      userId: req.user.userId, // ✅ Fixed: was req.user.id
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("[CREATE TASK ERROR]", error);
    res.status(400).json({ message: error.message });
  }
};


/**
 * @desc    Update a task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
export const updateTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = req.params.id;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId }, // ownership check
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("[UPDATE TASK ERROR]", error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
export const deleteTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = req.params.id;

    const task = await Task.findOneAndDelete({
      _id: taskId,
      userId,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE TASK ERROR]", error);
    res.status(500).json({ message: "Server error" });
  }
};
