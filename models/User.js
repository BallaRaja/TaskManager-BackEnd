import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  tokenVersion: { type: Number, default: 0 },
  // FCM device tokens for real push notifications
  fcmTokens: { type: [String], default: [] },
});

const User = mongoose.model("User", userSchema);

export default User;
