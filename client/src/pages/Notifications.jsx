import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Users, Wallet, Receipt, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { authApiRequest, readCachedAuthResponse, writeCachedAuthResponse } from "@/lib/api";
import { useNotificationsCount } from "@/hooks/use-notifications-count";
import { toast } from "sonner";

const iconMap = {
  added_to_group: Users,
  group_joined: Users,
  expense_added: Receipt,
  payment_requested: Wallet,
  payment_received: Wallet,
  payment_sent: Wallet,
  leave_request: LogOut,
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const { refreshUnreadCount } = useNotificationsCount();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedIds([]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function loadNotifications() {
    const cached = readCachedAuthResponse("/api/notifications");
    if (cached?.notifications) {
      setNotifications((cached.notifications || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setIsLoading(false);
    }

    try {
      const data = await authApiRequest("/api/notifications");
      setNotifications((data.notifications || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      writeCachedAuthResponse("/api/notifications", data);
      setSelectedIds([]);
    } catch (_err) {
      const msg = _err?.message || "Failed to load notifications";
      if (!cached) toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenNotification(notification) {
    try {
      if (!notification.read) {
        await authApiRequest(`/api/notifications/${notification.id}/read`, {
          method: "PATCH",
        });
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
        );
        refreshUnreadCount();
      }
    } catch (_error) {
      // Navigation is still more useful than blocking on read-state updates.
    }

    if (notification.groupId) {
      navigate(`/groups/${notification.groupId}`);
      return;
    }

    navigate("/notifications");
  }

  async function markAllAsRead() {
    try {
      setIsMutating(true);
      await authApiRequest("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setSelectedIds([]);
      refreshUnreadCount();
      toast.success("All notifications marked as read");
    } catch (_err) {
      toast.error(_err?.message || "Failed to mark all as read");
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteSelected() {
    // keep API for clearing all notifications
    try {
      setIsMutating(true);
      await authApiRequest("/api/notifications/clear", { method: "DELETE" });
      setNotifications([]);
      refreshUnreadCount();
      toast.success("Notifications cleared");
    } catch (_err) {
      toast.error(_err?.message || "Failed to clear notifications");
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-3 animate-pulse">
          <div className="h-10 w-56 bg-secondary rounded-xl" />
          <div className="h-20 bg-card border border-border rounded-2xl" />
          <div className="h-20 bg-card border border-border rounded-2xl" />
          <div className="h-20 bg-card border border-border rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
            <Bell className="w-7 h-7" /> Notifications
          </h1>
          {notifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={markAllAsRead}
                disabled={isMutating}
              >
                Mark All Read
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={deleteSelected}
                disabled={isMutating}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {notifications.map((n, i) => {
                const Icon = iconMap[n.type] || Bell;
                const read = Boolean(n.read);
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
                      read ? "bg-card border-border" : "bg-primary/5 border-primary/20"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenNotification(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenNotification(n);
                        }
                      }}
                      className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          read ? "bg-secondary" : "bg-primary/10"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${read ? "text-muted-foreground" : "text-primary"}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${read ? "text-muted-foreground" : "font-medium"}`}>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;
