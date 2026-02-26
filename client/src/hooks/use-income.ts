import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { fetchApi } from "@/lib/api";
import { z } from "zod";

type CreateIncomeInput = z.infer<typeof api.incomes.create.input>;
type UpdateIncomeInput = z.infer<typeof api.incomes.update.input>;

export function useIncomes(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [api.incomes.list.path, params],
    queryFn: async () => {
      let url = api.incomes.list.path;
      if (params) {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append("startDate", params.startDate);
        if (params.endDate) queryParams.append("endDate", params.endDate);
        if (queryParams.toString()) url += `?${queryParams.toString()}`;
      }
      
      const res = await fetchApi(url);
      if (!res.ok) throw new Error("Failed to fetch incomes");
      return api.incomes.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateIncomeInput) => {
      const res = await fetchApi(api.incomes.create.path, {
        method: api.incomes.create.method,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create income");
      return api.incomes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.incomes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateIncomeInput) => {
      const url = buildUrl(api.incomes.update.path, { id });
      const res = await fetchApi(url, {
        method: api.incomes.update.method,
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update income");
      return api.incomes.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.incomes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.incomes.delete.path, { id });
      const res = await fetchApi(url, {
        method: api.incomes.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete income");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.incomes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
