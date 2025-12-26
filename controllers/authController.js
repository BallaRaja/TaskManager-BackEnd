import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed });

    res.json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  console.log("🔐 [LOGIN] Request received");
  console.log("📧 Email:", req.body.email);

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ [LOGIN] User not found");
      return res.status(400).json({ error: "User not found" });
    }

    console.log("✅ [LOGIN] User found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ [LOGIN] Password mismatch");
      return res.status(400).json({ error: "Invalid password" });
    }

    console.log("✅ [LOGIN] Password matched");

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("🪪 [JWT] Token generated");
    console.log("🪪 [JWT] User:", user.email);

    res.json({
      token,
      email: user.email,
    });
  } catch (err) {
    console.log("🔥 [LOGIN] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

