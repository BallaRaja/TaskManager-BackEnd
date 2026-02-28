import User from "../models/User.js";
import Profile from "../models/Profile.js";
import TaskList from "../models/TaskList.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { body, validationResult } from "express-validator";
import nodemailer from "nodemailer";

/**
 * @desc Register user + create profile + create default "My Tasks" list
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { name, email, password } = req.body;

    console.info("📝 [REGISTER] Request received");

    if (!name || !email || !password) {
      throw new Error("Name, email and password are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    name = name.trim();
    email = email.toLowerCase().trim();

    if (!name) {
      throw new Error("Name is required");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Store hashed OTP
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Create user (unverified by default)
    const [newUser] = await User.create(
      [{
        email,
        password: hashedPassword,
        otp: hashedOtp,
        otpExpires,
        isVerified: false
      }],
      { session }
    );

    const userIdStr = newUser._id.toString();

    // Create profile
    await Profile.create(
      [{
        userId: userIdStr,
        profile: {
          email,
          fullName: name,
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

    console.info("\n==================================");
    console.info(`📧 [REGISTER] OTP FOR ${email}: ${otp}`);
    console.info(`⏰ [REGISTER] Expires at: ${otpExpires.toLocaleTimeString()}`);
    console.info("==================================\n");

    // Try to send the OTP via email if SMTP configured
    try {
      await sendEmail(
        email,
        "Verify your TaskManager account",
        `Your verification code is ${otp}. It expires at ${otpExpires.toLocaleTimeString()}`,
        `<p>Your verification code is <strong>${otp}</strong>. It expires at ${otpExpires.toLocaleTimeString()}.</p>`
      );
    } catch (e) {
      console.error("[REGISTER] Email send failed:", e?.message || e);
    }

    res.status(201).json({
      success: true,
      message: "User registered. Please verify your email with the OTP sent.",
      userId: newUser._id,
      email: newUser.email
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("❌ [REGISTER] Error:", err.message);

    const badRequestErrors = [
      "User with this email already exists",
      "Name, email and password are required",
      "Name is required",
      "Invalid email format"
    ];
    const statusCode = badRequestErrors.includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Verify OTP and activate account
 * @route POST /api/auth/verify-otp
 */
export const verifyOTP = async (req, res) => {
  try {
    let { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and OTP are required" });
    }

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, error: "User already verified" });
    }

    if (!user.otp || !user.otpExpires || new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, error: "OTP has expired. Please register again or request a new one." });
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, error: "Invalid OTP code" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    console.info(`✅ [VERIFY OTP] Success for ${email}`);

    res.json({ success: true, message: "Email verified successfully. You can now login." });
  } catch (err) {
    console.error("🔥 [VERIFY OTP] Error:", err.message);
    res.status(500).json({ success: false, error: "Server error during verification" });
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
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user) {
      console.warn("❌ [LOGIN] User not found");
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.warn("❌ [LOGIN] Invalid password");
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    if (!user.isVerified) {
      console.warn("❌ [LOGIN] Email not verified");
      return res.status(403).json({ success: false, error: "Please verify your email before logging in." });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const token = jwt.sign(
      { userId: user._id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.info("🪪 [LOGIN] JWT issued | userId:", user._id.toString());

    res.json({
      success: true,
      token,
      userId: user._id,
    });

  } catch (err) {
    console.error("🔥 [LOGIN] Error:", err.message);
    res.status(500).json({ success: false, error: "Server error during login" });
  }
};

/**
 * @desc Change password for authenticated user
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Old and new passwords are required" });
    }

    // Password strength validation (min 8 chars, 1 upper, 1 lower, 1 number)
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(newPassword)) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters long and include uppercase, lowercase, and a number." });
    }

    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Incorrect old password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion += 1; // Invalidate old sessions
    await user.save();

    res.json({ success: true, message: "Password updated successfully. All old sessions invalidated." });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error updating password" });
  }
};

/**
 * @desc Forgot password - send OTP
 */
export const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email is required" });

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user) {
      // For security, you might want to return 200 even if user not found, 
      // but here we follow user request for "User not found" message.
      return res.status(404).json({ success: false, error: "User with this email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = otpExpires;
    await user.save();

    console.info("\n==================================");
    console.info(`📧 [FORGOT PASSWORD] OTP FOR ${email}: ${otp}`);
    console.info(`⏰ [FORGOT PASSWORD] Expires at: ${otpExpires.toLocaleTimeString()}`);
    console.info("==================================\n");

    // Try to send the OTP via email
    try {
      await sendEmail(
        email,
        "TaskManager Password Reset Code",
        `Your password reset code is ${otp}. It expires at ${otpExpires.toLocaleTimeString()}`,
        `<p>Your password reset code is <strong>${otp}</strong>. It expires at ${otpExpires.toLocaleTimeString()}.</p>`
      );
    } catch (e) {
      console.error("[FORGOT PASSWORD] Email send failed:", e?.message || e);
    }

    res.json({ success: true, message: "OTP sent to your email for password reset." });
  } catch (err) {
    console.error("🔥 [FORGOT PASSWORD] Error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * @desc Reset password with OTP
 */
export const resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: "All fields (email, otp, newPassword) are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.otp || !user.otpExpires || new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, error: "Invalid or expired OTP" });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid OTP code" });
    }

    // Strength validation
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(newPassword)) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters long and include uppercase, lowercase, and a number." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion += 1; // Invalidate old sessions
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    console.info(`✅ [RESET PASSWORD] Success for ${email}`);

    res.json({ success: true, message: "Password reset successful. All old sessions invalidated." });
  } catch (err) {
    console.error("🔥 [RESET PASSWORD] Error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// --- Email helper ---
let mailTransporter = null;

function getTransporter() {
  if (mailTransporter) return mailTransporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    return mailTransporter;
  }
  return null;
}

async function sendEmail(to, subject, text, html) {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.info(`[MAIL] SMTP not configured. Skipping email to ${to}. Payload: ${text}`);
      return false;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    console.info(`[MAIL] Sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[MAIL] send error:", err.message);
    return false;
  }
}