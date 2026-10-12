/**
 * JSON Schema‌ 是一种‌数据格式‌，用于跨语言通信（如 OpenAPI/Swagger 文档）
 * 定义API返回给前端的字段和类型
 * 前端 TS 接口（api/quote.ts 里的 DailyQuote）和它们一一对应
 * 它是 Fastify response schema 的源，决定"哪些字段会出现在响应里"
 */

export const QuoteData = {
  type: "object",
  properties: {
    id: { type: "string" },
    stockId: { type: "string" },
    date: { type: "string" },
    open: { type: "number" },
    high: { type: "number" },
    low: { type: "number" },
    close: { type: "number" },
    volume: { type: "number" }, //成交量
    amount: { type: ["number", "null"] }, //成交额
    pctChange: { type: ["number", "null"] }, //涨跌幅
    turnover: { type: ["number", "null"] }, //换手率
    createdAt: { type: "string" },
  },

  required: [
    "id",
    "stockId",
    "date",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "createdAt",
  ],
} as const;
