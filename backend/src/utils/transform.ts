/**
 * 从数据库实体到DTO的映射。
 * 转成前端需要要的数据格式，就是序列化，把对象转换成JSON字符串
 * 从Prisma的实体取字段，转成API契约要求的格式
 * 但只挑给前端看的字段，只暴露必要的部分
 */

import type {
  Stock,
  DailyQuote,
  FundFlow,
} from "../generated/prisma/client.js";

// 定义一个数据转换函数，负责把Prisma的Stock数据结构转换成DTO
// "数据库里的对象"和"传输给客户端的对象"不是同一个东西，中间要有一层转换
// Dto: Data Transfer Object 数据传输对象
// 只所以要把date转成iso字符串，是因为我们在schema中定义的date字段是string，而不是Date
// 但我们通过findMany()得到的数据，它的date字段是Date类型，而不是string
// 序列化器会尝试把 Date 转成 string——但对 Date 的序列化行为在不同版本、不同场景下不一致；
// 显式 toISOString() 最稳
// 前端往数据库里做写操作时，也要把日期字符符转成Date
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

export function toQuoteDto(q: DailyQuote) {
  return {
    id: q.id,
    stockId: q.stockId,
    date: q.date.toISOString(),
    open: q.open,
    high: q.high,
    low: q.low,
    close: q.close,
    volume: q.volume,
    amount: q.amount,
    pctChange: q.pctChange,
    turnover: q.turnover,
    createdAt: q.createdAt.toISOString(),
  };
}

export function toFundFlowDto(f: FundFlow) {
  return {
    id: f.id,
    stockId: f.stockId,
    date: f.date.toISOString(),
    mainNet: f.mainNet,
    mainNet5d: f.mainNet5d,
    mainNet10d: f.mainNet10d,
    superLargeNet: f.superLargeNet,
    largeNet: f.largeNet,
    mediumNet: f.mediumNet,
    smallNet: f.smallNet,
    mainNetRatio: f.mainNetRatio,
    turnover: f.turnover,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}
