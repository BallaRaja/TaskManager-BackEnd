import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile
} from "../controllers/profileController.js";

const router = express.Router();

// GET profile by userId
router.get("/:userId", authMiddleware, getProfile);

// CREATE profile (optional if auto-created)
router.post("/", authMiddleware, createProfile);

// UPDATE profile
router.put("/:userId", authMiddleware, updateProfile);

// DELETE profile
router.delete("/:userId", authMiddleware, deleteProfile);

export default router;
