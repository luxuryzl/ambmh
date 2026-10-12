/**
 * 批量粘贴解析
 * 这是本阶段的关键工具：把用户从excel/软件复制的文本解析成结构化数据
 * 支持：Tab分割（从excel复制）, 逗号分割（CSV）， 空格分割
 * 顺序：从前往后：日期，开盘，最高，最低，收盘，成交量，[成交额]，[涨跌幅] 共8列，后2列可为空
 * 日期支持：2026-10-10 / 2026/10/10 / 20261010
 */

export interface ParsedRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
  pctChange?: number;
}

export interface ParsedResult {
  rows: ParsedRow[];
  errors: { line: number; message: string }[];
}

export function parseQuoteText(text: string): ParsedResult {
  const rows: ParsedRow[] = [];
  const errors: ParsedResult["errors"] = [];

  //   正则：\n 匹配 Unix/Linux/macOS 系统的换行符,\r? 表示 \r（回车符，常见于 Windows 系统的 \r\n）是可选的
  //   trim()去除每行首尾空格
  //   filter()过滤掉空行和假值
  //   处理成行数组[line1, line2, ...]
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // 遍历每一行
  for (let i = 0; i < lines.length; i += 1) {
    // 获取每一行的数据
    const line = lines[i]!; //// ← 去掉 undefined，类型变 string，i的范围保证不会越界

    // 分隔符：Tab，逗号，多空格
    // {2,}匹配‌连续出现 2 次或更多次‌的空白字符（包括空格、制表符 Tab、换行符等）
    // 把每一行处理成6列
    const parts = line
      .split(/\t|,|\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    //   如果不足6列，把错误数据写进错误数组，因为最少需要前6列数据
    if (parts.length < 6) {
      errors.push({
        line: i + 1,
        message: `列数不足，至少6列，实际${parts.length}列`,
      });
      //   循环不停止，继续处理下一行
      continue;
    }

    // 解析赋值，获取每一列的数据
    const [
      dateRaw,
      openRaw,
      highRaw,
      lowRaw,
      closeRaw,
      volumeRaw,
      amountRaw,
      pctRaw,
    ] = parts;

    const date = normalizeDate(dateRaw!); //辅助函数的定义在下面
    if (!date) {
      //   日期格式错误，跳过该行
      errors.push({
        line: i + 1,
        message: `日期格式错误，无法解析：${dateRaw}`,
      });
      continue;
    }

    const open = Number(openRaw);
    const high = Number(highRaw);
    const low = Number(lowRaw);
    const close = Number(closeRaw);
    const volume = Number(volumeRaw);

    // 如果这5列数字有1个解析失败，则跳过本行数据
    if ([open, high, low, close, volume].some((n) => Number.isNaN(n))) {
      errors.push({
        line: i + 1,
        message: "数字解析失败",
      });
      continue;
    }

    const row: ParsedRow = {
      date,
      open,
      high,
      low,
      close,
      volume,
    };

    if (amountRaw !== undefined) {
      const amount = Number(amountRaw);
      if (!Number.isNaN(amount)) row.amount = amount;
    }

    if (pctRaw !== undefined) {
      const pct = Number(pctRaw);
      if (!Number.isNaN(pct)) row.pctChange = pct;
    }

    rows.push(row);
  }

  //   normalizeDate()辅助函数;
  function normalizeDate(s: string): string | null {
    // 解析日期字符串，旨在同时兼容两种常见的日期格式分隔符 2026-01-01 2026/10/10
    let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);

    // 如果匹配成功
    if (m) {
      const [, y, mo, d] = m; //第1个,的作用是‌跳过（忽略）数组中的第一个元素‌，因为0是整个匹配的字符串
      return `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    }

    // 兼容20261010，必须已经是补过0的格式
    m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
    if (m) {
      const [, y, mo, d] = m;
      return `${y}-${mo}-${d}`;
    }

    return null;
  }

  return { rows, errors };
}
