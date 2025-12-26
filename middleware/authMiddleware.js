import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    console.log("🔐 Authorization header:", req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.log("❌ No Authorization header");
        return res.status(401).json({ message: "No token" });
    }

    if (!authHeader.startsWith("Bearer ")) {
        console.log("❌ Not Bearer format");
        return res.status(400).json({ message: "Bad Authorization format" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔑 Token received:", token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token valid:", decoded);
        req.user = decoded;
        next();
    } catch (err) {
        console.log("❌ JWT verify error:", err.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export default authMiddleware;
