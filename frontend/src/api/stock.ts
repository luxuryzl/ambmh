import { http } from "./request";

// 股票市场分类
export type Market = "SH" | "SZ" | "BJ" | "HK";

// 数据结构
export interface Stock {
  id: string;
  code: string;
  name: string;
  market: Market;
  industry: string | null; //所属行业
  listDate: string | null; //上市时间
  isActive: boolean; //处理退市/停牌股票
  createdAt: string;
  updatedAt: string;
}

// 列表查询时的参数
export interface ListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  market?: Market;
}

// 分页数据结构
export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Upsert是 ‌Update（更新）‌ 和 ‌Insert（新增）‌ 的缩写
export interface StockUpsertPayload {
  code: string;
  name: string;
  market: Market;
  industry?: string;
  listDate?: string;
}

export const stockApi = {
  list: (params: ListParams = {}) =>
    http<Paginated<Stock>>({ url: "/stocks", method: "GET", params }),

  detail: (id: string) => http<Stock>({ url: `/stocks/${id}`, method: "GET" }),

  create: (payload: StockUpsertPayload) =>
    http<Stock>({ url: "/stocks", method: "POST", data: payload }),

  update: (
    id: string,
    payload: Partial<StockUpsertPayload> & { isActive?: boolean },
  ) => http<Stock>({ url: `/stocks/${id}`, method: "PATCH", data: payload }),

  remove: (id: string) =>
    http<null>({ url: `/stocks/${id}`, method: "DELETE" }),

  // 下面的items加了{}是因为后端接口 /stocks/import 期望接收一个包含 items 字段的对象，而不是直接接收一个数组。
  import: (items: StockUpsertPayload[]) =>
    http<{ created: number; updated: number; skipped: number }>({
      url: "/stocks/import",
      method: "POST",
      data: { items },
    }),
};
