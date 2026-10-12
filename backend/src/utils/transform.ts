import type { Stock } from "../generated/prisma/client.js";

// 定义一个数据转换函数，负责把Prisma的Stock数据结构转换成DTO
// "数据库里的对象"和"传输给客户端的对象"不是同一个东西，中间要有一层转换
// Dto: Data Transfer Object 数据传输对象
export function toStockDto(s: Stock) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    market: s.market,
    industry: s.industry,
    listDate: s.listDate ? s.listDate.toISOString() : null,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
