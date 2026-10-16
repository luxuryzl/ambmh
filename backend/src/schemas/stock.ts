/**
 * Fastify 的 response schema
 * JSON Schema‌ 是一种‌数据格式‌，用于跨语言通信（如 OpenAPI/Swagger 文档）
 * JSON的原生类型 只有：string、number、boolean、null、object、array。都是小写的
 * 声明"出去的"（response）,Fastify 的 response schema 只认 JSON Schema
 * Zod校验“进来的”，他们两个负责一进一出，各司其职。
 * 定义API返回给前端的字段和类型
 * 前端 TS 接口（api/stock.ts 里的 Stock）和它们一一对应
 * 它是 Fastify response schema 的源，决定"哪些字段会出现在响应里"
 */

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
