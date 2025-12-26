import User from "../models/user.js";
import Profile from "../models/profile.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/**
 * @desc Register user + create profile
 */
export const register = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { email, password } = req.body;

    console.info("📝 [REGISTER] Request received");

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    email = email.toLowerCase().trim();

    const existingUser = await User
      .findOne({ email })
      .session(session);

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await User.create(
      [{ email, password: hashedPassword }],
      { session }
    );

    await Profile.create(
      [{
        userId: newUser._id.toString(),
        profile: {
          email,
          fullName: "User",
          avatarUrl: "https://via.placeholder.com/150",
          bio: "",
        },
        stats: {
          totalTasks: 0,
          tasksCompleted: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          streak: 0,
        },
        aiFeatures: true,
      }],
      { session }
    );

    await session.commitTransaction();

    console.info("✅ [REGISTER] Success | userId:", newUser._id.toString());

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id,
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ [REGISTER] Error:", err.message);

    res.status(err.message === "User already exists" ? 400 : 500)
      .json({ error: err.message });

  } finally {
    session.endSession();
  }
};

/**
 * @desc Login user
 */
export const login = async (req, res) => {
  console.info("🔐 [LOGIN] Request received");

  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user) {
      console.warn("❌ [LOGIN] User not found");
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.warn("❌ [LOGIN] Invalid password");
      return res.status(400).json({ error: "Invalid password" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.info("🪪 [LOGIN] JWT issued | userId:", user._id.toString());

    res.json({
      token,
      userId: user._id,
    });

  } catch (err) {
    console.error("🔥 [LOGIN] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
