"use client";

import { useMemo, useState, useEffect } from "react";
import { parseWechatCSV, type WechatTransactionRow } from "./parser";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: WechatTransactionRow[]; filename: string };

export default function Page() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [tradeTimeInput, setTradeTimeInput] = useState<string>("");
  const [productInput, setProductInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]); // 先用 any，等你做完再補型別

  useEffect(() => {
    (async () => {
      try {
        setState({ status: "loading" });
        const res = await fetch("/api/transactions");
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
        setState({ status: "idle" });
      } catch (e) {
        setState({ status: "error", message: "讀取資料失敗" });
      }
    })();
  }, []);

  const accept = ".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

  const decodeTextSmart = async (file: File) => {
    const buf = await file.arrayBuffer();
    // WeChat CSV is often GBK/GB18030. Modern browsers typically support gb18030.
    const tryDecode = (enc: string) => new TextDecoder(enc, { fatal: false }).decode(buf);
    const utf8 = tryDecode("utf-8");
    if (/[�]/.test(utf8)) {
      try {
        const gb = tryDecode("gb18030");
        if (!/[�]/.test(gb)) return gb;
      } catch {
        // ignore and fall back
      }
    }
    return utf8;
  };

  const onAddManualRow = async () => {
    setState({ status: "loading" });
    const d = new Date();
    const nowTradeTime =
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    
    const tradeTime = tradeTimeInput.trim() || nowTradeTime;
    const product = productInput.trim();
    const amount = Number(amountInput);

    // 驗證
    if ( !product || !amountInput.trim()) {
      setState({ status: "error", message: "請填寫交易時間、商品、金額。" });
      return;
    }
    if (!Number.isFinite(amount)) {
      setState({ status: "error", message: "金額必須是數字。" });
      return;
    }

    //準備數據
    const newTransaction: WechatTransactionRow = {
      tradeTime,
      product,
      amount,
      amountRaw: amountInput.trim(),
      direction: "expense", // 預設手動新增為支出，根據需要可改成 income 或讓使用者選擇
    };
    try {
      // 3. 發送請求到後端 API
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTransaction),
      });

      if (!res.ok) {
        throw new Error("儲存至資料庫失敗");
      }

      const savedDoc = await res.json();

      // 4. 成功後更新 UI
      // 注意：這裡直接更新 rows (從資料庫拿回來的狀態)，而不是 manualRows
      setRows((prev) => [savedDoc, ...prev]);

      // 5. 清空輸入框
      setTradeTimeInput("");
      setProductInput("");
      setAmountInput("");
      setState({ status: "idle" });
      if (state.status === "error") setState({ status: "idle" });

    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "發生未知錯誤" });
      setState({ status: "idle" });
    }
  };

  // const displayRows =
  //   state.status === "ready"
  //     ? [...manualRows,...state.rows]
  //     : manualRows;
    

  const total = useMemo(() => {
    return rows.reduce((sum, r) => {
      const sign = r.direction === "expense" ? -1 : 1; // income/unknown 當 +1（可自行調整 unknown）
      return sum + sign * (Number.isFinite(r.amount) ? r.amount : 0);
    }, 0);
  }, [rows]);

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // allow re-upload same file
    e.target.value = "";

    const lower = file.name.toLowerCase();
    const isCsv =
      file.type === "text/csv" ||
      lower.endsWith(".csv") ||
      file.type === "application/vnd.ms-excel";
    const isXlsx =
      lower.endsWith(".xlsx") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!isCsv && !isXlsx) {
      setState({ status: "error", message: "只接受 .csv 或 .xlsx 檔案。" });
      return;
    }

    setState({ status: "loading" });
    try {
      let csvText: string;

      if (isCsv) {
        csvText = await decodeTextSmart(file);
      } else {
        const buf = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const firstSheetName = wb.SheetNames?.[0];
        if (!firstSheetName) {
          setState({ status: "error", message: "XLSX 內沒有找到工作表。" });
          return;
        }
        const sheet = wb.Sheets[firstSheetName];
        csvText = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n" });
      }

      const parsed = parseWechatCSV(csvText);
      if (parsed.length === 0) {
        setState({
          status: "error",
          message:
            "沒有解析到資料。請確認檔案內含表頭且包含「交易時間 / 商品 / 金額」欄位（欄位名稱可能略有不同）。",
        });
        return;
      }
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed), // 傳送陣列
      })
      
      const refreshRes = await fetch("/api/transactions");
      const newData = await refreshRes.json();
      setRows(newData);
      setState({ status: "idle" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "讀取或解析失敗。";
      setState({ status: "error", message });
    }
  };

  const onSaveAll = async () => {
    if (state.status !== "ready") return;

    setState({ status: "loading" });
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.rows), // 發送解析後的完整陣列
      });

      if (res.ok) {
        // 上傳成功後，重新獲取資料庫最新的列表
        const refreshRes = await fetch("/api/transactions");
        const newData = await refreshRes.json();
        setRows(newData);
        
        // 回到閒置狀態並清空解析暫存
        setState({ status: "idle" });
        alert("全部資料已成功匯入資料庫！");
      } else {
        throw new Error("上傳失敗");
      }
    } catch (err) {
      setState({ status: "error", message: "批量儲存失敗，請檢查網路或資料格式。" });
    }
  };

  const rowBgClass = (dir: WechatTransactionRow["direction"]) => {
    if (dir === "income") return "odd:bg-emerald-50 even:bg-emerald-100 hover:bg-emerald-200";
    if (dir === "expense") return "odd:bg-rose-50 even:bg-rose-100 hover:bg-rose-200";
    return "odd:bg-zinc-50 even:bg-white hover:bg-zinc-100";
  };

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold tracking-tight">WeChat CSV 交易列表</h1>
              <div className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4">
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-zinc-600">交易時間</label>
                  <input
                    value={tradeTimeInput}
                    onChange={(e) => setTradeTimeInput(e.target.value)}
                    placeholder="2026-04-26 12:30:00"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">商品</label>
                  <input
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    placeholder="午餐 / 交通 / 咖啡..."
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-zinc-600">金額</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      inputMode="decimal"
                      placeholder="120"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    />
                    <button
                      type="button"
                      disabled={state.status === "loading"}
                      onClick={onAddManualRow}
                      className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      新增
                    </button>
                  </div>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:justify-between">
              <span className="text-sm text-zinc-600">
                上傳 .csv / .xlsx 後，會列出「交易時間 / 商品 / 金額」三個欄位。
              </span>
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
                <input
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={onPickFile}
                />
                選擇檔案
              </label>
            </div>
              
          </div>
          </div>
          {state.status === "ready" && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-200">
              <span className="text-sm text-amber-800">
                檢測到來自 <b>{state.filename}</b> 的 {state.rows.length} 筆資料，準備好匯入資料庫了嗎？
              </span>
              <button
                onClick={onSaveAll}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                確認匯入所有資料
              </button>
            </div>
          )}

          <div className="mt-4">
            {state.status === "idle" && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
                尚未上傳檔案。
              </div>
            )}
  
            {state.status === "loading" && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                解析中…
              </div>
            )}

            {state.status === "error" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {state.message}
              </div>
            )}

            {rows.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-zinc-700">
                  {state.status === "ready" && (<>
                    檔案：<span className="font-medium text-zinc-900">{state.filename}</span></>
                  )}
                    <span className="mx-2 text-zinc-300">|</span>
                    共 <span className="font-medium text-zinc-900">{rows.length}</span> 筆
                  </div>
                  <div className="text-sm text-zinc-700">
                    合計：<span className="font-semibold tabular-nums text-zinc-900">{total}</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <div className="max-h-[60vh] overflow-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          <th className="border-b border-zinc-200 px-4 py-3">交易時間</th>
                          <th className="border-b border-zinc-200 px-4 py-3">商品</th>
                          <th className="border-b border-zinc-200 px-4 py-3 text-right">金額</th>
                          <th className="border-b border-zinc-200 px-4 py-3 text-right">收/支</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={`${r.tradeTime}-${r.product}-${idx}`} className={` ${rowBgClass(r.direction)}`}>
                            <td className={`whitespace-nowrap border-b border-zinc-100 px-4 py-3 text-zinc-800`}>
                              {r.tradeTime}
                            </td>
                            <td className="border-b border-zinc-100 px-4 py-3 text-zinc-900">
                              {r.product}
                            </td>
                            <td className="whitespace-nowrap border-b border-zinc-100 px-4 py-3 text-right font-medium tabular-nums text-zinc-900">
                              {r.amount}
                            </td>
                            <td className="whitespace-nowrap border-b border-zinc-100 px-4 py-3 text-right font-medium tabular-nums text-zinc-900">
                              {r.direction}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          小提醒：不同版本匯出的 CSV 欄位名稱可能不一樣；本頁會嘗試自動匹配「交易時間 / 商品 / 金額」相關欄位。
        </p>
      </div>
    </main>
  );
}
