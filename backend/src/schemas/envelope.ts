export function envelope<T extends Record<string, unknown>>(dataSchema: T) {
  return {
    type: "object",
    properties: {
      code: { type: "number" },
      msg: { type: "string" },
      data: dataSchema,
    },
    required: ["code", "msg", "data"],
  } as const; //as const 的核心作用是‌防止 TypeScript 对返回对象的类型进行“拓宽”（Widening），从而保留最精确的字面量类型和只读属性‌。
}

// 空data的信封，用于delete, logout这类无返回体接口
export const emptyEnvelope = {
  type: "object",
  properties: {
    code: { type: "number" },
    msg: { type: "string" },
    data: {},
  },
  required: ["code", "msg", "data"],
} as const;

// 常用data片段，可组合
export const nullableString = { type: ["string", "null"] } as const;
export const nullableNumber = { type: ["number", "null"] } as const;

// 分布响应data片段
export function paginated<T extends Record<string, unknown>>(itemSchema: T) {
  return {
    type: "object",
    properties: {
      list: { type: "array", items: itemSchema },
      total: { type: "number" },
      page: { type: "number" },
      pageSize: { type: "number" },
    },
    required: ["list", "total", "page", "pageSize"],
  } as const;
}

// 错误响应， 4xx 5xx 也走信封
export const errorEnvelope = {
  type: "object",
  properties: {
    code: { type: "number" },
    msg: { type: "string" },
    data: { type: "null" },
  },
  required: ["code", "msg", "data"],
} as const;
