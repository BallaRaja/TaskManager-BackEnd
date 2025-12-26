import express from "express";
import { register, login } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// ✅ Session verification using userId
router.get("/verify", authMiddleware, (req, res) => {
  console.log("🟢 [VERIFY] Session valid for userId:", req.user.userId);

  res.json({
    valid: true,
    userId: req.user.userId,
  });
});

export default router;
