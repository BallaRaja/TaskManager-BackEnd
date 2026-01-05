import User from "../models/User.js";
import Profile from "../models/Profile.js";
import TaskList from "../models/TaskList.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/**
 * @desc Register user + create profile + create default "My Tasks" list
 * @route POST /api/auth/register
 * @access Public
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

    // Check if user already exists
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await User.create(
      [{ email, password: hashedPassword }],
      { session }
    );

    const userIdStr = newUser._id.toString();

    // Create profile
    await Profile.create(
      [{
        userId: userIdStr,
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

    // Create default "My Tasks" task list
    await TaskList.create(
      [{
        userId: userIdStr,
        title: "My Tasks",
        taskIds: [],
        isDefault: true,
      }],
      { session }
    );

    await session.commitTransaction();

    console.info("✅ [REGISTER] Success | userId:", userIdStr);

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ [REGISTER] Error:", err.message);

    const statusCode = err.message === "User already exists" ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
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