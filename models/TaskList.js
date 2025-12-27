import mongoose from "mongoose";

const taskListSchema = new mongoose.Schema(
  {
    userId: {
      type: String,          // 🔑 same as Task.userId
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    taskIds: {
      type: [String],        // 🔑 array of task _id as strings
      default: [],
    },

    isDefault: {
      type: Boolean,
      default: false,        // "My Tasks"
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TaskList", taskListSchema);
