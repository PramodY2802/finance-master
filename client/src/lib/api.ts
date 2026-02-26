
import { api as routesApi } from "@shared/routes";

// Utility to manage JWT tokens in localStorage
export const tokenStorage = {
  getToken: () => localStorage.getItem("accessToken"),
  setToken: (token: string) => localStorage.setItem("accessToken", token),
  getRefreshToken: () => localStorage.getItem("refreshToken"),
  setRefreshToken: (token: string) => localStorage.setItem("refreshToken", token),
  clear: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};

// Custom fetch wrapper that injects the authorization header
export async function fetchApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = tokenStorage.getToken();
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  // Simple interceptor for 401 Unauthorized to attempt refresh
  if (response.status === 401) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken && !url.includes(routesApi.auth.refresh.path)) {
      try {
        const refreshRes = await fetch(routesApi.auth.refresh.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken })
        });
        
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          tokenStorage.setToken(data.token);
          // Retry original request
          headers.set("Authorization", `Bearer ${data.token}`);
          response = await fetch(url, { ...config, headers });
        } else {
          tokenStorage.clear();
          window.location.href = "/login";
        }
      } catch (err) {
        tokenStorage.clear();
        window.location.href = "/login";
      }
    } else {
      tokenStorage.clear();
      if (!url.includes(routesApi.auth.login.path) && !url.includes(routesApi.auth.me.path)) {
        window.location.href = "/login";
      }
    }
  }

  return response;
}
