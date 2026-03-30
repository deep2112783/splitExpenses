import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import groupRoutes from "./routes/groups.js";
import notificationRoutes from "./routes/notifications.js";
import settlementRoutes from "./routes/settlements.js";
import dashboardRoutes from "./routes/dashboard.js";
import { connectDatabase } from "./config/db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:8080",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isDbConnected ? "ok" : "degraded",
    message: isDbConnected ? "Server and database are running" : "Server is running, database is unavailable",
    database: isDbConnected ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

async function connectWithRetry() {
  try {
    await connectDatabase();
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    console.error("Retrying database connection in 10 seconds...");
    setTimeout(connectWithRetry, 10000);
  }
}

connectWithRetry();
