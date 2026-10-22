/**
 * 东方财富
 */

import type { IDataSource, RemoteQuote, RemoteFundFlow } from "./types";

export class EastMoneyDataSource implements IDataSource {
  name = "EastMoney 东方财富";

  async fetchQuote(
    stockCode: string,
    market: string,
    limit = 120,
  ): Promise<RemoteQuote[]> {
    const secid =
      market.toLowerCase() === "sh" ? `1.${stockCode}` : `0.${stockCode}`;
    const endDate = new Date();
    const begDate = new Date();
    begDate.setDate(endDate.getDate() - limit * 2); //多取一点天数，防止节假日
    const begStr = begDate.toISOString().slice(0, 10).replace(/-/g, "");
    const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");
    const url = `http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&beg=${begStr}&end=${endStr}`;

    // 关键修复：加上 Headers 伪装成浏览器，防止被东财拦截
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `http://quote.eastmoney.com/`,
        Accept: "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    });

    const json = (await res.json()) as any;
    console.log("打印数据：", json);

    // 如果获取不到 klines，打印具体报错方便排查
    if (!json?.data?.klines) {
      throw new Error(
        `东财 K线获取失败，状态码：${json?.rc}，数据：${JSON.stringify(json?.data)}`,
      );
    }

    return json.data.klines.map((line: string) => {
      const parts = line.split(",");
      return {
        date: parts[0] ?? "",
        open: Number(parts[1] ?? 0),
        close: Number(parts[2] ?? 0),
        high: Number(parts[3] ?? 0),
        low: Number(parts[4] ?? 0),
        volume: Number(parts[5] ?? 0) * 100, // 东财返回的是手，乘 100 转成股
        amount: Number(parts[6] ?? 0), // 成交额
        amplitude: Number(parts[7] ?? 0), // 振幅
        pctChange: Number(parts[8] ?? 0), // 涨跌幅
        change: Number(parts[9] ?? 0), // 涨跌额
        turnover: Number(parts[10] ?? 0), // 换手率
      };
    });
  }

  async fetchFundFlow(
    stockCode: string,
    market: string,
    limit?: 60,
  ): Promise<RemoteFundFlow[]> {
    // 东方财富资金流接口需要 secid，如 1.600519 (沪) 或 0.000001 (深)
    const secid =
      market.toLowerCase() === "sh" ? `1.${stockCode}` : `0.${stockCode}`;

    // 东方财富资金流历史接口
    // fields1 &klt=101是日线
    // fields2 控制返回的列：
    // f51(日期) f52(主力净额) f53(小单) f54(中单) f55(大单) f56(超大单)
    // f57(主力净占比) f58... f62(5日主力净额) f63(10日主力净额)...
    const url = `https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=${limit}&klt=101&secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65`;

    const res = await fetch(url);
    const json = (await res.json()) as any;

    const klines = json?.data?.klines;
    if (!klines || !Array.isArray(klines)) {
      throw new Error("无法获取东方财富资金流数据");
    }

    return klines.map((line: string) => {
      const parts = line.split(",");
      //console.log("打印字段：", parts);
      return {
        date: parts[0] ?? "", // 加上 ?? "" 兜底，防止 undefined
        mainNet: Number(parts[1] ?? 0), //主力净额
        superLargeNet: Number(parts[5] ?? 0),
        largeNet: Number(parts[4] ?? 0),
        mediumNet: Number(parts[3] ?? 0),
        smallNet: Number(parts[2] ?? 0),
        mainNetRatio: parts[6] ? Number(parts[6]) : undefined, // 主力净占比
      };
    });
  }
}
