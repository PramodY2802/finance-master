import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchApi } from "@/lib/api";

export function useDashboardStats(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [api.dashboard.stats.path, params],
    queryFn: async () => {
      let url = api.dashboard.stats.path;
      if (params) {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append("startDate", params.startDate);
        if (params.endDate) queryParams.append("endDate", params.endDate);
        if (queryParams.toString()) url += `?${queryParams.toString()}`;
      }

      const res = await fetchApi(url);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await res.json();
      return api.dashboard.stats.responses[200].parse(data);
    },
  });
}
