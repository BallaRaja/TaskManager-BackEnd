import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";
import {
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  uploadProfilePhoto,
  deleteProfilePhoto
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

// UPLOAD profile photo
router.post("/:userId/photo", authMiddleware, upload.single('photo'), uploadProfilePhoto);

// DELETE profile photo
router.delete("/:userId/photo", authMiddleware, deleteProfilePhoto);

export default router;
