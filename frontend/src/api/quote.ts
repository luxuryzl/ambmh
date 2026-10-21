import { http } from "./request";

// 行情
export interface DailyQuote {
  id: string;
  stockId: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number | null;
  pctChange: number | null;
  turnover: number | null;
  createdAt: string;
}

// 行情输入
export interface QuoteInput {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
  pctChange?: number;
  turnover?: number;
}

// 行情批量输入结果
export interface BatchResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { index: number; date: string; message: string }[];
}

// 行情列表查询参数
export interface QuoteListParams {
  stockId: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
}

// 行情列表分页
export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const quoteApi = {
  list: (params: QuoteListParams) => {
    // 自动清理空字符串
    const cleanParams = { ...params };
    if (cleanParams.from === "") delete cleanParams.from;
    if (cleanParams.to === "") delete cleanParams.to;
    return http<Paginated<DailyQuote>>({
      url: "/quotes",
      method: "GET",
      params: cleanParams,
    });
  },

  latest: (stockId: string, limit = 60) =>
    http<DailyQuote[]>({
      url: `/quotes/latest/${stockId}`,
      method: "GET",
      params: { limit },
    }),

  create: (payload: QuoteInput & { stockId: string }) =>
    http<DailyQuote>({ url: "/quotes", method: "POST", data: payload }),

  batch: (stockId: string, items: QuoteInput[]) =>
    http<BatchResult>({
      url: `/quotes/batch`,
      method: "POST",
      data: { stockId, items },
    }),

  remove: (id: string) =>
    http<null>({ url: `/quotes/${id}`, method: "DELETE" }),
};
