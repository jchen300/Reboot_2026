// lib/file-processor.ts
import { parseWechatCSV, type WechatTransactionRow } from "@/app/parser";

/**
 * 智能解碼：處理微信 CSV 常見的 GBK/GB18030 編碼問題
 */
export async function decodeFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const tryDecode = (enc: string) => new TextDecoder(enc, { fatal: false }).decode(buf);
  
  const utf8 = tryDecode("utf-8");
  // 檢查是否含有亂碼符號，如果有則嘗試 GB18030
  if (/[]/.test(utf8)) {
    try {
      const gb = tryDecode("gb18030");
      if (!/[]/.test(gb)) return gb;
    } catch {
      // 忽略解碼錯誤，回退到 utf8
    }
  }
  return utf8;
}

/**
 * 核心處理函式：將 File 物件轉換為結構化資料
 */
export async function processTransactionFile(file: File): Promise<WechatTransactionRow[]> {
  const lower = file.name.toLowerCase();
  const isCsv = file.type === "text/csv" || lower.endsWith(".csv") || file.type === "application/vnd.ms-excel";
  const isXlsx = lower.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!isCsv && !isXlsx) {
    throw new Error("只接受 .csv 或 .xlsx 檔案。");
  }

  let csvText: string;

  if (isCsv) {
    csvText = await decodeFileText(file);
  } else {
    // XLSX 處理邏輯
    const buf = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "array" });
    const firstSheetName = wb.SheetNames?.[0];
    
    if (!firstSheetName) throw new Error("XLSX 內沒有找到工作表。");
    
    const sheet = wb.Sheets[firstSheetName];
    csvText = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n" });
  }

  const parsed = parseWechatCSV(csvText);
  if (parsed.length === 0) {
    throw new Error("沒有解析到有效資料。請檢查檔案格式。");
  }

  return parsed;
}