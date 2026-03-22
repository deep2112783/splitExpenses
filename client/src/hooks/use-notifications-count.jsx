import { useCallback, useEffect, useState } from "react";
import { authApiRequest } from "@/lib/api";

export function useNotificationsCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await authApiRequest("/api/notifications");
      setUnreadCount(data.unreadCount || 0);
    } catch (_error) {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return { unreadCount, refreshUnreadCount };
}
