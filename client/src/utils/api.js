// Configure base URL based on environment
// Production: VITE_API_URL=https://api.playincognito.ng (set in .env)
// Development: falls back to localhost:5000
export const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = SOCKET_URL + "/api";

const handleResponse = async (res, endpoint) => {
  const data = await res.json();
  if (!res.ok) {
    // Global handler for invalid/expired tokens (401 Unauthorized or 403 Forbidden)
    // Ensure we don't trigger this for login failures or guest users (no token)
    if (
      (res.status === 401 || res.status === 403) &&
      localStorage.getItem("token") &&
      endpoint !== "/auth/login"
    ) {
      console.warn("Auth: Invalid or expired token detected, logging out...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
        return;
      }
    }

    // Create an error object with the response data
    const error = new Error(data.error || "Request failed");
    error.response = { data };
    error.status = res.status;
    throw error;
  }
  return data;
};

export const api = {
  get: async (endpoint, init = {}) => {
    const token = localStorage.getItem("token");
    const { headers: extraHeaders, ...rest } = init;
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(extraHeaders || {}),
      },
    });
    return handleResponse(res, endpoint);
  },
  post: async (endpoint, data) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res, endpoint);
  },
  put: async (endpoint, data) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res, endpoint);
  },
  delete: async (endpoint, init = {}) => {
    const token = localStorage.getItem("token");
    const { headers: extraHeaders, ...rest } = init;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(extraHeaders || {}),
      },
    });
    return handleResponse(res, endpoint);
  },
  upload: async (endpoint, formData) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(res, endpoint);
  },
};
