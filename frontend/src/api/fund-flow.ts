import { http } from "./request";

// 定义数据结构，14个字段，全量，和后端一致
export interface FundFlow {
  id: string;
  stockId: string;
  date: string;
  mainNet: number;
  mainNet5d: number;
  mainNet10d: number;
  superLargeNet: number;
  largeNet: number;
  mediumNet: number;
  smallNet: number;
  mainNetRatio: number | null;
  turnover: number | null;
  createdAt: string;
  updatedAt: string;
}

// 定义输入的数据结构，10个字段
export interface FundFlowInput {
  date: string;
  mainNet: number;
  mainNet5d?: number;
  mainNet10d?: number;
  superLargeNet?: number;
  largeNet?: number;
  mediumNet?: number;
  smallNet?: number;
  mainNetRatio?: number | null;
  turnover?: number | null;
}

// 数据分析的数据结构
export interface FundFlowAnalysis {
  latestDate: string | null; // 最新的日期
  latestMainNet: number | null; // 最新的主力净流入
  latestMainNet5d: number | null; // 最新的主力净流入5日
  consecutiveInflowDays: number; // 连续主力净流入天数
  consecutiveOutflowDays: number; // 连续主力净流出天数
  inflowScore: number; // 主力净流入得分
  trend: "bullish" | "bearish" | "neutral"; // 趋势: 看涨 | 看跌 | 平
  recent5dNet: number; // 最近5日净流入
}

// 批量录入的结果
export interface BatchResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { index: number; date: string; message: string }[];
}

// 列表参数
export interface FundFlowListParams {
  stockId: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
}

// 分页的数据结构
export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const fundFlowApi = {
  // 列表查询，显示全部14个字段
  list: (params: FundFlowListParams) =>
    http<Paginated<FundFlow>>({ url: "/fund-flow", method: "GET", params }),

  // 最新N条
  latest: (stockId: string, limit = 60) =>
    http<FundFlow[]>({
      url: `/fund-flow/latest/${stockId}`,
      method: "GET",
      params: { limit },
    }),

  // 分析
  analysis: (stockId: string) =>
    http<FundFlowAnalysis>({
      url: `/fund-flow/analysis/${stockId}`,
      method: "GET",
    }),

  // 录入数据
  create: (payload: FundFlowInput & { stockId: string }) =>
    http<FundFlow>({ url: "/fund-flow", method: "POST", data: payload }),

  // 批量录入数据
  batch: (stockId: string, items: FundFlowInput[]) =>
    http<BatchResult>({
      url: "/fund-flow/batch",
      method: "POST",
      data: { stockId, items },
    }),

  // 删除数据
  remove: (id: string) =>
    http<null>({ url: `/fund-flow/${id}`, method: "DELETE" }),
};
