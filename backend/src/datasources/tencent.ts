/**
 * 腾讯财经K线数据接口
 */

import type { IDataSource, RemoteQuote } from "./types";

export class TencentDataSource implements IDataSource {
  name = "Tecent 腾讯财经";

  async fetchQuote(
    stockCode: string,
    market: string,
    limit = 120,
  ): Promise<RemoteQuote[]> {
    // 腾讯接口要求带市场前缀，如：SH600000 SZ000001
    const prefix = market.toLowerCase() === "sh" ? "sh" : "sz";
    const symbol = `${prefix}${stockCode}`;

    // 获取最近N天的日K线数据，（加不加 fq 都可以，这里用 qfq 前复权）
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,${limit},qfq`;

    const res = await fetch(url);
    const json = (await res.json()) as any;

    // 解析腾讯返回的复杂结构
    const dataNode = json?.data?.[symbol]?.qfqday || json?.data?.[symbol]?.day;
    if (!dataNode || !Array.isArray(dataNode)) {
      throw new Error("无法获取腾讯K线数据");
    }

    // 腾讯返回的数组通常是：[日期, 开, 收, 高, 低, 成交量(手), 成交额(元), 振幅, 换手率...]
    return dataNode.map((item: any) => ({
      date: item[0], // 2023-10-20
      open: Number(item[1]),
      close: Number(item[2]),
      high: Number(item[3]),
      low: Number(item[4]),
      volume: Number(item[5]) * 100, // 腾讯返回的是“手”，乘 100 转“股”
      amount: item[6] ? Number(item[6]) : undefined,
      pctChange: item[8] ? Number(item[8]) : undefined,
      turnover: item[9] ? Number(item[9]) : undefined,
    }));
  }

  async fetchFundFlow(): Promise<any[]> {
    throw new Error("腾讯接口暂不支持资金流，请使用 EastMoneyDataSource");
  }
}
