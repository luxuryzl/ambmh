import { http } from "./request";

export const syncApi = {
  syncQuotes: (stockId: string) =>
    http<{ source: string; created: number; updated: number }>({
      url: `/sync/quotes/${stockId}`,
      method: "POST",
    }),

  syncFundFlow: (stockId: string) =>
    http<{ source: string; created: number; updated: number }>({
      url: `/sync/fund-flow/${stockId}`,
      method: "POST",
    }),
};
