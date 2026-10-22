import type { IDataSource, RemoteQuote } from "./types";

export class SinaDataSource implements IDataSource {
  name = "Sina 新浪财经";

  async fetchQuote(
    stockCode: string,
    market: string,
    limit = 120,
  ): Promise<RemoteQuote[]> {
    const pureCode = stockCode.replace(/^(sh|sz)/i, "");
    const symbol =
      market.toLowerCase() === "sh" ? `sh${pureCode}` : `sz${pureCode}`;

    // 新浪的日K线接口（不包含换手率，但包含成交额）
    const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=${limit}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://finance.sina.com.cn/",
      },
    });

    const text = await res.text();
    if (!text || text === "null") {
      throw new Error(`新浪 K线获取失败: ${symbol}`);
    }

    const json = JSON.parse(text);

    return json.map((item: any) => {
      // 新浪没有直接给换手率，我们可以给 undefined，或者用 0 占位
      // 如果一定要换手率，可以后续让前端自己算（成交量/流通股），或者手动录入
      return {
        date: item.day,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume), // 新浪直接返回的就是股
        amount: undefined, // 新浪的这个接口没返回成交额
        pctChange: undefined, // 没返回涨跌幅
        turnover: undefined, // 没返回换手率
      };
    });
  }

  async fetchFundFlow(): Promise<any[]> {
    throw new Error("新浪不支持资金流，请用东财");
  }
}
