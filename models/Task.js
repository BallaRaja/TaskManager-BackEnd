import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
    {
        enabled: {
            type: Boolean,
            default: false,
        },
        remindAt: {
            type: Date,
        },
    },
    { _id: false }
);

const repeatSchema = new mongoose.Schema(
    {
        frequency: {
            type: String,
            enum: ["daily", "weekly", "monthly", "yearly"],
        },
        interval: {
            type: Number,
            min: 1,
            default: 1,
        },
        daysOfWeek: {
            type: [String],
            enum: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
        },
        until: {
            type: Date,
            default: null,
        },
    },
    { _id: false }
);

const taskSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            ref: "User",
            required: true,
            index: true,
        },
        taskListId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TaskList",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },

        notes: {
            type: String,
            trim: true,
        },

        status: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending",
            index: true,
        },

        isArchived: {
            type: Boolean,
            default: false,
            index: true,
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
            index: true,
        },

        completedAt: {
            type: Date,
            default: null,
        },

        dueDate: {
            type: Date,
            default: null,
            index: true,
        },
        status: {
  type: String,
  enum: ['pending', 'in_progress', 'completed'],
  default: 'pending' },

        reminder: reminderSchema,

        repeat: repeatSchema,

        // ── Notification tracking ─────────────────────────────────────────────
        // Three separate flags so each notification fires exactly once.
        // All reset to false whenever dueDate is changed or task is re-opened.
        reminder30Sent: { type: Boolean, default: false, index: true }, // 30-min before
        reminder5Sent: { type: Boolean, default: false, index: true }, // 5-min before
        missedSent: { type: Boolean, default: false, index: true }, // after deadline
    },
    {
        timestamps: true, // adds createdAt & updatedAt
    }
);

export default mongoose.model("Task", taskSchema);
