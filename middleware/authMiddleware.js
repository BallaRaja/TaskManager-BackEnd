import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  console.log("🔐 [AUTH] Protected route accessed");

  const authHeader = req.headers.authorization;
  console.log("📥 Authorization header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ Invalid Authorization header");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  console.log("🔑 Token extracted");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ decoded = { userId, iat, exp }
    req.user = decoded;

    console.log("✅ JWT verified for userId:", decoded.userId);
    next();
  } catch (err) {
    console.log("❌ JWT verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
