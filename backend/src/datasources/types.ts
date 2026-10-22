export interface RemoteQuote {
  date: string; // yyyy-MM-dd
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; //统一为“股”
  amount?: number | null; //统一为“元”
  amplitude?: number | null;
  pctChange?: number | null;
  change?: number | null;
  turnover?: number | null;
}

export interface RemoteFundFlow {
  date: string;
  mainNet: number;
  mainNet5d?: number;
  superLargeNet?: number;
  largeNet?: number;
  mediumNet?: number;
  smallNet?: number;
  mainNetRatio?: number;
}

export interface IDataSource {
  name: string;
  // 获取最近N天的日线数据
  fetchQuote(
    stockCode: string,
    market: string,
    limit?: number,
  ): Promise<RemoteQuote[]>;

  // 获取最近N天的资金流数据
  fetchFundFlow(
    stockCode: string,
    market: string,
    limit?: number,
  ): Promise<RemoteFundFlow[]>;
}
