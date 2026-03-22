import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/User.js";

function getJwtSecret() {
  return process.env.JWT_SECRET || "";
}

export async function requireAuth(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database unavailable. Allow your IP in MongoDB Atlas Network Access and try again.",
      });
    }

    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const secret = getJwtSecret();
    if (!secret) {
      return res.status(500).json({ message: "Server authentication is not configured." });
    }

    const payload = jwt.verify(token, secret);

    const user = await User.findById(payload.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
