import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const { refreshUnreadCount } = useNotificationsCount();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const cached = readCachedAuthResponse("/api/notifications");
    if (cached?.notifications) {
      setNotifications(cached.notifications);
      setIsLoading(false);
    }

    try {
      const data = await authApiRequest("/api/notifications");
      setNotifications(data.notifications || []);
      writeCachedAuthResponse("/api/notifications", data);
      setSelectedIds([]);
    } catch (_err) {
      if (!cached) toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSelection(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }

  async function markSelectedRead() {
    if (selectedIds.length === 0) {
      toast.error("Select notifications first");
      return;
    }

    try {
      setIsMutating(true);
      await authApiRequest("/api/notifications/read-selected", {
        method: "PATCH",
        body: JSON.stringify({ ids: selectedIds }),
      });
      setNotifications((prev) =>
        prev.map((n) => (selectedIds.includes(n.id) ? { ...n, read: true } : n)),
      );
      setSelectedIds([]);
      refreshUnreadCount();
      toast.success("Selected notifications marked as read");
    } catch (_err) {
      toast.error("Failed to mark selected notifications");
    } finally {
      setIsMutating(false);
    }
  }

  async function markAllAsRead() {
    try {
      setIsMutating(true);
      await authApiRequest("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setSelectedIds([]);
      refreshUnreadCount();
      toast.success("All notifications marked as read");
    } catch (_err) {
      toast.error("Failed to mark all as read");
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) {
      toast.error("Select notifications first");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected notifications?`)) return;

    try {
      setIsMutating(true);
      await authApiRequest("/api/notifications/selected", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      refreshUnreadCount();
      toast.success("Selected notifications deleted");
    } catch (_err) {
      toast.error("Failed to delete selected notifications");
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
                onClick={markSelectedRead}
                disabled={isMutating || selectedIds.length === 0}
              >
                Mark read
              </Button>
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
                disabled={isMutating || selectedIds.length === 0}
              >
                Delete
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
            <p className="text-xs text-muted-foreground px-1">{selectedIds.length} selected</p>

            <div className="space-y-3">
              {notifications.map((n, i) => {
                const Icon = iconMap[n.type] || Bell;
                const selected = selectedIds.includes(n.id);
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
                      n.read ? "bg-card border-border" : "bg-primary/5 border-primary/20"
                    } ${selected ? "ring-1 ring-primary/40" : ""}`}
                    onClick={() => toggleSelection(n.id)}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        n.read ? "bg-secondary" : "bg-primary/10"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}>{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
