import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  console.log("🔐 [AUTH] Protected route accessed");

  const authHeader = req.headers.authorization;
  console.log("📥 [AUTH] Authorization header:", authHeader);

  if (!authHeader) {
    console.log("❌ [AUTH] No Authorization header");
    return res.status(401).json({ message: "No token provided" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log("❌ [AUTH] Invalid Authorization format");
    return res.status(400).json({ message: "Bad Authorization format" });
  }

  const token = authHeader.split(" ")[1];
  console.log("🔑 [JWT] Token extracted:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("✅ [JWT] Token verified successfully");
    console.log("🧾 [JWT] Decoded payload:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.log("❌ [JWT] Verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
