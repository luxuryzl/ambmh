// 可以给前端返回哪些字段的数据，在这里定义，共14个字段
export const FundFlowData = {
  type: "object",
  properties: {
    id: { type: "string" },
    stockId: { type: "string" },
    date: { type: "string" },
    mainNet: { type: "number" }, // 主力净流入
    mainNet5d: { type: "number" },
    mainNet10d: { type: "number" },
    superLargeNet: { type: "number" },
    largeNet: { type: "number" },
    mediumNet: { type: "number" },
    smallNet: { type: "number" },
    mainNetRatio: { type: "number" }, // 主力净流入占比
    turnover: { type: ["number", "null"] },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: [
    "id",
    "stockId",
    "date",
    "mainNet",
    "mainNet5d",
    "mainNet10d",
    "superLargeNet",
    "largeNet",
    "mediumNet",
    "smallNet",
    "mainNetRatio",
    "turnover",
    "createdAt",
    "updatedAt",
  ],
};
