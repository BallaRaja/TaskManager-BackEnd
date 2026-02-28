import express from "express";
import {
  register,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  changePassword
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);

// Password Management
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authMiddleware, changePassword);

// ✅ Session verification using userId
router.get("/verify", authMiddleware, (req, res) => {
  console.log("🟢 [VERIFY] Session valid for userId:", req.user.userId);

  res.json({
    valid: true,
    userId: req.user.userId,
  });
});

export default router;
