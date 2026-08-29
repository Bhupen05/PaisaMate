import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach access tokens
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const authData = localStorage.getItem("suraty_auth");
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          if (state?.accessToken) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          }
        } catch (e) {
          console.error("Failed to parse auth from localStorage", e);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Shared in-flight refresh promise so concurrent 401s trigger a single
// /auth/refresh call instead of racing each other with the same refresh token.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const authData = localStorage.getItem("suraty_auth");
      if (!authData) throw new Error("No stored auth data");
      const parsed = JSON.parse(authData);
      const refreshToken = parsed.state?.refreshToken;
      if (!refreshToken) throw new Error("No refresh token available");

      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const { access_token, refresh_token, user } = res.data;

      parsed.state.accessToken = access_token;
      parsed.state.refreshToken = refresh_token;
      parsed.state.user = user;
      localStorage.setItem("suraty_auth", JSON.stringify(parsed));

      return access_token as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Response interceptor to handle token refresh automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== "undefined") {
      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token expired or invalid", refreshError);
        localStorage.removeItem("suraty_auth");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
