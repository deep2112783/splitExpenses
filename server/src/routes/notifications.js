import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const data = notifications.map((notification) => ({
      id: notification._id,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      groupId: notification.group,
      createdAt: notification.createdAt,
    }));

    const unreadCount = data.filter((item) => !item.read).length;

    return res.json({ notifications: data, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load notifications", error: error.message });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark notification read", error: error.message });
  }
});

router.patch("/read-selected", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: "Notification ids are required" });
    }

    await Notification.updateMany(
      { _id: { $in: ids }, user: req.user._id },
      { read: true },
    );

    return res.json({ message: "Selected notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark selected notifications", error: error.message });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark all as read", error: error.message });
  }
});

router.delete("/selected", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: "Notification ids are required" });
    }

    await Notification.deleteMany({ _id: { $in: ids }, user: req.user._id });
    return res.json({ message: "Selected notifications deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete selected notifications", error: error.message });
  }
});

router.delete("/clear", async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    return res.json({ message: "Notifications cleared" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to clear notifications", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete notification", error: error.message });
  }
});

export default router;
