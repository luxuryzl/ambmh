export const StockData = {
  type: "object",
  properties: {
    id: { type: "string" },
    code: { type: "string" },
    name: { type: "string" },
    market: { type: "string" },
    industry: { type: ["string", "null"] },
    listDate: { type: ["string", "null"] },
    isActive: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: [
    "id",
    "code",
    "name",
    "market",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
} as const;

export const MarketEnum = ["SH", "SZ", "BJ", "HK"];
export type Market = (typeof MarketEnum)[number];
// “获取 MarketEnum 数组中‌所有数字索引位置上的值的类型union（联合）
// MarketEnum[0] 的类型是 "SH"
