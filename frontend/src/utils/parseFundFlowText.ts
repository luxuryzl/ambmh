/**
 * 资金流粘贴格式：列顺序
 * 日期 主力净额 [5日主力] [10日主力] [超大单] [大单] [中单] [小单] 共8个字段
 * 金额支持：纯数字、1.2亿、5000万
 */

export interface ParsedFlowRow {
  date: string;
  mainNet: number;
  mainNet5d?: number;
  mainNet10d?: number;
  superLargeNet?: number;
  largeNet?: number;
  mediumNet?: number;
  smallNet?: number;
}

export interface ParseFlowResult {
  rows: ParsedFlowRow[];
  errors: { line: number; message: string }[];
}

/** 把 "1.2亿"、"5000万"、"12345678" 转成数字（元） */
export function parseAmount(s: string): number | null {
  const t = s.trim();
  if (!t) return null;

  const m = /^(-?\d+(?:\.\d+)?)\s*(亿|万|千)?$/.exec(t);
  if (!m) {
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  }

  const num = Number(m[1]);
  const unit = m[2];
  let multiplier = 1;
  if (unit === "亿") multiplier = 1e8;
  else if (unit === "万") multiplier = 1e4;
  else if (unit === "千") multiplier = 1e3;
  return num * multiplier;
}

export function parseFundFlowText(text: string): ParseFlowResult {
  const rows: ParsedFlowRow[] = [];
  const errors: ParseFlowResult["errors"] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const parts = line
      .split(/\t|,|\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      errors.push({
        line: i + 1,
        message: `列数不足（至少 2 列），实际 ${parts.length} 列`,
      });
      continue;
    }

    const [
      dateRaw,
      mainRaw,
      main5Raw,
      main10Raw,
      superRaw,
      largeRaw,
      mediumRaw,
      smallRaw,
    ] = parts;

    const date = normalizeDate(dateRaw!);
    if (!date) {
      errors.push({ line: i + 1, message: `无法解析日期：${dateRaw}` });
      continue;
    }

    const mainNet = parseAmount(mainRaw!);
    if (mainNet === null) {
      errors.push({ line: i + 1, message: `无法解析主力净额：${mainRaw}` });
      continue;
    }

    const row: ParsedFlowRow = { date, mainNet };
    const opt = (v: string | undefined) =>
      v === undefined ? undefined : (parseAmount(v) ?? undefined);
    row.mainNet5d = opt(main5Raw);
    row.mainNet10d = opt(main10Raw);
    row.superLargeNet = opt(superRaw);
    row.largeNet = opt(largeRaw);
    row.mediumNet = opt(mediumRaw);
    row.smallNet = opt(smallRaw);

    rows.push(row);
  }

  return { rows, errors };
}

function normalizeDate(s: string): string | null {
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo}-${d}`;
  }
  return null;
}
