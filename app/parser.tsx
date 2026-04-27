export type WechatTransactionRow = {
  tradeTime: string;
  product: string;
  amount: number;
  amountRaw?: string;
  direction: "income" | "expense" | "unknown";
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // drop trailing empty last line
    if (row.length === 1 && row[0] === "" && rows.length > 0) return;
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      pushField();
      continue;
    }

    if (ch === "\r") {
      const next = text[i + 1];
      if (next === "\n") i++;
      pushField();
      pushRow();
      continue;
    }

    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  pushField();
  if (row.length > 1 || row[0] !== "" || rows.length === 0) pushRow();
  return rows;
}

function normalizeHeader(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）()]/g, "")
    .replace(/[:：]/g, "");
}

function pickHeaderIndex(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalizeHeader);
  const candidateSet = new Set(candidates.map(normalizeHeader));
  for (let i = 0; i < normalized.length; i++) {
    if (candidateSet.has(normalized[i])) return i;
  }
  // fallback: allow "contains" matches (e.g. 交易时间(北京时间))
  const candidateList = candidates.map(normalizeHeader).filter(Boolean);
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (!h) continue;
    if (candidateList.some((c) => c && (h.includes(c) || c.includes(h)))) return i;
  }
  return -1;
}

function pickHeaderIndexByRegex(headers: string[], re: RegExp) {
  for (let i = 0; i < headers.length; i++) {
    if (re.test(headers[i] ?? "")) return i;
  }
  return -1;
}

function getColumnIndices(headers: string[]) {
  const idxTime = pickHeaderIndex(headers, [
    "交易时间",
    "交易時間",
    "时间",
    "time",
    "交易日期",
    "日期",
    "date",
  ]);
  const idxProduct = pickHeaderIndex(headers, [
    "商品",
    "商品名称",
    "商品名稱",
    "商品名",
    "商品信息",
    "名称",
    "名稱",
    "product",
    "item",
  ]);
  const idxAmount = pickHeaderIndex(headers, [
    "金额",
    "金額",
    "金额元",
    "金額元",
    "实付金额",
    "實付金額",
    "应付金额",
    "應付金額",
    "amount",
    "money",
    "total",
  ]);
  const idxDirection = pickHeaderIndex(headers, [
    "收/支", 
    "收支",     
    "收入/支出", 
    "收入支出",
    "收/付",
    "收付",
    "收/付",
    "收付",
    "收/付",
    "收付",
    "收/付",
    "收付",
  ]);

  let timeIdx = idxTime;
  let productIdx = idxProduct;
  let amountIdx = idxAmount;
    
  let directionIdx = idxDirection;

  // final fallback: regex based matching if exact/contains failed
  if (timeIdx < 0) timeIdx = pickHeaderIndexByRegex(headers, /(交易)?(时间|時間|日期|date|time)/i);
  if (productIdx < 0) productIdx = pickHeaderIndexByRegex(headers, /(商品|名稱|名称|product|item)/i);
  if (amountIdx < 0) amountIdx = pickHeaderIndexByRegex(headers, /(金额|金額|amount|money|total)/i);
  if (directionIdx < 0) directionIdx = pickHeaderIndexByRegex(headers, /(收支|收支|收入|支出)/i);

  return { timeIdx, productIdx, amountIdx, directionIdx };
}

function findWechatHeaderRowIdx(table: string[][]) {
  const maxScan = Math.min(table.length, 80);
  for (let i = 0; i < maxScan; i++) {
    const r = table[i];
    if (!r || r.every((c) => c.trim() === "")) continue;
    const headers = r.map((h) => (h ?? "").trim());
    const { timeIdx, productIdx, amountIdx, directionIdx } = getColumnIndices(headers);
    if (timeIdx >= 0 && productIdx >= 0 && amountIdx >= 0) return i;
  }
  // fallback: first non-empty row
  return table.findIndex((r) => r.some((c) => c.trim() !== ""));
}

function parseAmount(raw: string): number | null {
  const s = raw
    .trim()
    .replace(/[¥￥]/g, "")
    .replace(/[,，]/g, "")
    .replace(/\s+/g, "");
  if (!s) return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse WeChat exported CSV and return normalized rows.
 * Expected columns (header may vary): 交易时间/交易時間, 商品/商品名称, 金额/金额(元)
 */
export function parseWechatCSV(csvText: string): WechatTransactionRow[] {
  const trimmed = csvText.replace(/^\uFEFF/, ""); // remove BOM
  const table = parseCsv(trimmed);
  if (table.length === 0) return [];

  // WeChat exports sometimes include a lot of metadata lines before the actual header.
  const headerRowIdx = findWechatHeaderRowIdx(table);
  if (headerRowIdx < 0) return [];

  const headers = table[headerRowIdx].map((h) => h.trim());
  const { timeIdx, productIdx, amountIdx, directionIdx } = getColumnIndices(headers);

  if (timeIdx < 0 || productIdx < 0 || amountIdx < 0 || directionIdx < 0) return [];

  const out: WechatTransactionRow[] = [];
  for (let i = headerRowIdx + 1; i < table.length; i++) {
    const r = table[i];
    if (!r || r.every((c) => c.trim() === "")) continue;

    const tradeTime = (r[timeIdx] ?? "").trim();
    const product = (r[productIdx] ?? "").trim();
    const amountRaw = (r[amountIdx] ?? "").trim();

    const dirRaw = directionIdx >= 0 ? (r[directionIdx] ?? "").trim() : "";
    if (dirRaw === "/") continue;
    const direction =
    dirRaw.includes("收入") || dirRaw === "收"
      ? "income"
      : dirRaw.includes("支出") || dirRaw === "支"
        ? "expense"
        : product === "/"
          ? "income" // 可選：fallback 規則
          : "unknown";
    if (!tradeTime && !product && !amountRaw) continue;

    const amount = parseAmount(amountRaw);
    if (amount == null) continue;

    out.push({ tradeTime, product, amount, amountRaw, direction });
  }
  return out;
}
