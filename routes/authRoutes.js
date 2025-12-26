import express from "express";
import { register, login } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// 🔐 verify session
router.get("/verify", authMiddleware, (req, res) => {
  console.log("🟢 [VERIFY] Session valid for:", req.user.email);

  res.json({
    valid: true,
    user: req.user,
  });
});


export default router;
