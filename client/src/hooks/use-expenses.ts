import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { fetchApi } from "@/lib/api";
import { z } from "zod";

type CreateExpenseInput = z.infer<typeof api.expenses.create.input>;
type UpdateExpenseInput = z.infer<typeof api.expenses.update.input>;

export function useExpenses(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [api.expenses.list.path, params],
    queryFn: async () => {
      let url = api.expenses.list.path;
      if (params) {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append("startDate", params.startDate);
        if (params.endDate) queryParams.append("endDate", params.endDate);
        if (queryParams.toString()) url += `?${queryParams.toString()}`;
      }
      
      const res = await fetchApi(url);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return api.expenses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      const res = await fetchApi(api.expenses.create.path, {
        method: api.expenses.create.method,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create expense");
      return api.expenses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateExpenseInput) => {
      const url = buildUrl(api.expenses.update.path, { id });
      const res = await fetchApi(url, {
        method: api.expenses.update.method,
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update expense");
      return api.expenses.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.expenses.delete.path, { id });
      const res = await fetchApi(url, {
        method: api.expenses.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete expense");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
