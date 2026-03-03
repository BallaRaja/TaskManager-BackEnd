// controllers/notificationController.js
import User from "../models/User.js";
import Task from "../models/Task.js";

// ─────────────────────────────────────────────────────────────────────────────
// FCM Token Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/register-token
 * Saves the FCM device token for the authenticated user.
 */
export const registerFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user.userId;

        if (!fcmToken || typeof fcmToken !== "string") {
            return res.status(400).json({ message: "fcmToken is required" });
        }

        await User.findByIdAndUpdate(userId, {
            $addToSet: { fcmTokens: fcmToken },
        });

        console.log(`✅ [FCM] Token registered for user ${userId}`);
        return res.json({ message: "FCM token registered" });
    } catch (err) {
        console.error("❌ [FCM] registerFcmToken error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * DELETE /api/notifications/unregister-token
 * Removes a stale FCM token on logout / token refresh.
 */
export const unregisterFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user.userId;

        if (!fcmToken) {
            return res.status(400).json({ message: "fcmToken is required" });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: fcmToken },
        });

        console.log(`🗑️  [FCM] Token removed for user ${userId}`);
        return res.json({ message: "FCM token removed" });
    } catch (err) {
        console.error("❌ [FCM] unregisterFcmToken error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification Action Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/mark-done/:taskId
 * Marks a task as completed (called when user taps "Mark as Done" in notification).
 */
export const markTaskDone = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.userId;

        const task = await Task.findOneAndUpdate(
            { _id: taskId, userId },
            {
                status: "completed",
                completedAt: new Date(),
            },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        console.log(`✅ [ACTION] Task "${task.title}" marked as done via notification`);
        return res.json({ success: true, data: task });
    } catch (err) {
        console.error("❌ [ACTION] markTaskDone error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/notifications/extend/:taskId
 * Extends task deadline by 30 minutes and resets all notification flags
 * so the full notification sequence fires again. 
 */
export const extendTaskDeadline = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.userId;

        const task = await Task.findOne({ _id: taskId, userId });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Always extend from NOW (current time) + 30 min, not from the stored dueDate.
        // This ensures the new deadline is always in the future.
        const newDueDate = new Date(Date.now() + 30 * 60 * 1000); // now + 30 min

        const updated = await Task.findByIdAndUpdate(
            taskId,
            {
                dueDate: newDueDate,
                // Reset all flags → cron will send 30-min and 5-min reminders again
                reminder30Sent: false,
                reminder5Sent: false,
                missedSent: false,
            },
            { new: true }
        );

        console.log(
            `🔁 [ACTION] Task "${task.title}" extended to ${newDueDate.toISOString()}`
        );
        return res.json({ success: true, data: updated });
    } catch (err) {
        console.error("❌ [ACTION] extendTaskDeadline error:", err.message);
    };
}