import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type errorSchemas } from "@shared/routes";
import { fetchApi, tokenStorage } from "@/lib/api";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type LoginInput = z.infer<typeof api.auth.login.input>;
type ResetPasswordInput = z.infer<typeof api.auth.resetPassword.input>;
type ForgotPasswordInput = z.infer<typeof api.auth.forgotPassword.input>;

export function useUser() {
  return useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      if (!tokenStorage.getToken()) return null;
      const res = await fetchApi(api.auth.me.path);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user profile");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          const error = api.auth.login.responses[401].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Login failed");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      tokenStorage.setToken(data.token);
      tokenStorage.setRefreshToken(data.refreshToken);
      queryClient.setQueryData([api.auth.me.path], data.user);
      setLocation("/");
      toast({ title: "Welcome back", description: "Successfully logged in." });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      await fetchApi(api.auth.logout.path, {
        method: api.auth.logout.method,
        body: JSON.stringify({ refreshToken }),
      });
    },
    onSettled: () => {
      tokenStorage.clear();
      queryClient.clear();
      setLocation("/login");
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      const res = await fetch(api.auth.forgotPassword.path, {
        method: api.auth.forgotPassword.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(errorData.message || "Failed to process request");
      }
      return res.json();
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      const res = await fetch(api.auth.resetPassword.path, {
        method: api.auth.resetPassword.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(errorData.message || "Failed to reset password");
      }
      return res.json();
    },
  });
}
