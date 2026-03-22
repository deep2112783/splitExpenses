import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApiRequest, clearAuthSession, getStoredUser, getToken } from "@/lib/api";

export function useRequireAuth() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const token = getToken();
  const hasCachedSession = Boolean(token && storedUser);

  const [user, setUser] = useState(storedUser);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!hasCachedSession);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      const liveToken = getToken();
      if (!liveToken) {
        clearAuthSession();
        if (isMounted) {
          setUser(null);
          setIsCheckingAuth(false);
        }
        navigate("/login", { replace: true });
        return;
      }

      try {
        const data = await authApiRequest("/api/users/me");
        if (!isMounted) return;
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch (_error) {
        clearAuthSession();
        if (!isMounted) return;
        setUser(null);
        navigate("/login", { replace: true });
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return { user, setUser, isCheckingAuth };
}
