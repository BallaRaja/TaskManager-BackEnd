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

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ [LOGIN] User not found");
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ [LOGIN] Invalid password");
      return res.status(400).json({ error: "Invalid password" });
    }

    // ✅ JWT contains ONLY userId
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("🪪 [JWT] Token issued for userId:", user._id.toString());

    res.json({
      token,
      userId: user._id,
    });
  } catch (err) {
    console.log("🔥 [LOGIN] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
