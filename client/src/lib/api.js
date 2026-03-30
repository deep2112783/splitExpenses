export async function apiRequest(path, options = {}) {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers: mergedHeaders,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  if (!response.ok) {
    // try to include server-provided message or raw body for better debugging
    let bodyText = null;
    if (!payload) {
      try {
        bodyText = await response.text();
      } catch (_e) {
        bodyText = null;
      }
    }

    const message = payload?.message || bodyText || response.statusText || "Request failed";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    clearAuthCache();
  }

  return payload;
}

function clearAuthCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("split-smartly:cache:")) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  } catch (_error) {
    // Ignore storage failures.
  }
}

function getAuthCacheKey(path) {
  const token = getToken();
  const tokenKey = token ? token.slice(0, 16) : "guest";
  return `split-smartly:cache:${tokenKey}:${path}`;
}

export function readCachedAuthResponse(path) {
  try {
    const raw = sessionStorage.getItem(getAuthCacheKey(path));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export function writeCachedAuthResponse(path, data) {
  try {
    sessionStorage.setItem(getAuthCacheKey(path), JSON.stringify(data));
  } catch (_error) {
    // Ignore storage failures.
  }
}

export function getToken() {
  return localStorage.getItem("token") || "";
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export function setAuthSession({ token, user }) {
  clearAuthCache();
  if (token) {
    localStorage.setItem("token", token);
  }
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function clearAuthSession() {
  clearAuthCache();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function authApiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return apiRequest(path, {
    ...options,
    headers,
  });
}
