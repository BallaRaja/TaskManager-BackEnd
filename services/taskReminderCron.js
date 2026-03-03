// services/taskReminderCron.js
//
// Runs every minute.
// Sends 3 types of push notifications for each task:
//   1. 30-min before deadline  → "Mark as Done" button
//   2.  5-min before deadline  → "Mark as Done" button
//   3. After deadline (missed) → "Extend 30 Minutes" + "Mark as Done" buttons
//
// All messages are DATA-ONLY so Flutter shows local notifications with
// action buttons (FCM notification messages cannot carry custom actions).

import cron from "node-cron";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { sendPushNotification } from "../config/firebase.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(date) {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const period = hours < 12 ? "AM" : "PM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
}

/** Fetch FCM tokens for a user, remove invalid ones from DB if returned */
async function getUserTokens(userId) {
    const user = await User.findById(userId).select("fcmTokens");
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return [];
    return user.fcmTokens;
}

async function removeInvalidTokens(userId, invalidTokens) {
    if (!invalidTokens || invalidTokens.length === 0) return;
    await User.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: { $in: invalidTokens } },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 30-MINUTE REMINDER
// Window: tasks with dueDate between now+28min and now+32min (4-min wide)
// ─────────────────────────────────────────────────────────────────────────────
async function send30MinReminders(now) {
    const lo = new Date(now.getTime() + 28 * 60 * 1000);
    const hi = new Date(now.getTime() + 32 * 60 * 1000);

    const tasks = await Task.find({
        status: "pending",
        isArchived: { $ne: true },
        dueDate: { $gte: lo, $lte: hi },
        reminder30Sent: { $ne: true },
    }).select("_id title dueDate userId");

    for (const task of tasks) {
        const tokens = await getUserTokens(task.userId);
        if (tokens.length === 0) continue;

        const timeStr = formatTime(task.dueDate);
        const result = await sendPushNotification(
            tokens,
            "⏰ Task Due in 30 Minutes",
            `"${task.title}" is due at ${timeStr}`,
            {
                taskId: task._id.toString(),
                dueDate: task.dueDate.toISOString(),
                type: "reminder_30",
                actions: "mark_done",          // Flutter reads this to add action buttons
            }
        );

        console.log(`  📢 [30-min] "${task.title}" → ${result.success} ok`);
        await removeInvalidTokens(task.userId, result.invalidTokens);
        await Task.findByIdAndUpdate(task._id, { reminder30Sent: true });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 5-MINUTE REMINDER
// Window: tasks with dueDate between now+3min and now+7min (4-min wide)
// ─────────────────────────────────────────────────────────────────────────────
async function send5MinReminders(now) {
    const lo = new Date(now.getTime() + 3 * 60 * 1000);
    const hi = new Date(now.getTime() + 7 * 60 * 1000);

    const tasks = await Task.find({
        status: "pending",
        isArchived: { $ne: true },
        dueDate: { $gte: lo, $lte: hi },
        reminder5Sent: { $ne: true },
    }).select("_id title dueDate userId");

    for (const task of tasks) {
        const tokens = await getUserTokens(task.userId);
        if (tokens.length === 0) continue;

        const timeStr = formatTime(task.dueDate);
        const result = await sendPushNotification(
            tokens,
            "🚨 Task Due in 5 Minutes!",
            `"${task.title}" is due at ${timeStr} — complete it now!`,
            {
                taskId: task._id.toString(),
                dueDate: task.dueDate.toISOString(),
                type: "reminder_5",
                actions: "mark_done",
            }
        );

        console.log(`  📢 [5-min] "${task.title}" → ${result.success} ok`);
        await removeInvalidTokens(task.userId, result.invalidTokens);
        await Task.findByIdAndUpdate(task._id, { reminder5Sent: true });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MISSED DEADLINE NOTIFICATION
// Fires for any pending task whose deadline was at least 5 minutes ago.
// The 5-min grace period prevents overlap with the 5-min-before reminder.
// missedSent flag ensures each task is notified exactly once.
// ─────────────────────────────────────────────────────────────────────────────
async function sendMissedReminders(now) {
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const tasks = await Task.find({
        status: "pending",
        isArchived: { $ne: true },
        dueDate: { $lte: fiveMinAgo }, // deadline passed at least 5 min ago
        missedSent: { $ne: true },     // not yet notified
    }).select("_id title dueDate userId");

    for (const task of tasks) {
        const tokens = await getUserTokens(task.userId);
        if (tokens.length === 0) continue;

        const result = await sendPushNotification(
            tokens,
            "❌ Task Deadline Missed",
            `You missed "${task.title}". Extend or mark as done.`,
            {
                taskId: task._id.toString(),
                dueDate: task.dueDate.toISOString(),
                type: "missed",
                actions: "extend_and_mark_done",  // Flutter shows both buttons
            }
        );

        console.log(`  📢 [missed] "${task.title}" → ${result.success} ok`);
        await removeInvalidTokens(task.userId, result.invalidTokens);
        await Task.findByIdAndUpdate(task._id, { missedSent: true });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main cron tick
// ─────────────────────────────────────────────────────────────────────────────
async function runReminderTick() {
    const now = new Date();
    try {
        await Promise.all([
            send30MinReminders(now),
            send5MinReminders(now),
            sendMissedReminders(now),
        ]);
    } catch (err) {
        console.error("❌ [CRON] runReminderTick error:", err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — call once from server.js
// ─────────────────────────────────────────────────────────────────────────────
export function startTaskReminderCron() {
    console.log("🕐 Task reminder cron started (runs every minute)");
    cron.schedule("* * * * *", runReminderTick);
}
