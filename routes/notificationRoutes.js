// routes/notificationRoutes.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    registerFcmToken,
    unregisterFcmToken,
    markTaskDone,
    extendTaskDeadline,
} from "../controllers/notificationController.js";

const router = express.Router();

// All routes require authentication
router.post("/register-token", authMiddleware, registerFcmToken);
router.delete("/unregister-token", authMiddleware, unregisterFcmToken);

// Notification action buttons
router.post("/mark-done/:taskId", authMiddleware, markTaskDone);
router.post("/extend/:taskId", authMiddleware, extendTaskDeadline);

export default router;
