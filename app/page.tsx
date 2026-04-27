"use client";

import { useMemo, useState, useEffect } from "react";
import { parseWechatCSV, type WechatTransactionRow } from "./parser";
import { formatDateTime } from "@/lib/format";  
import { useTransactions } from "@/hooks/use-transactions";
import { processTransactionFile } from "@/lib/file-processor";
import { TransactionTable } from "@/app/component/TransactionTable";
import { AddTransactionForm } from "@/app/component/AddTransactionForm";
import { FileImporter } from "./component/FileImporter";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: WechatTransactionRow[]; filename: string };

export default function Page() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const { rows, setRows, loading, refresh } = useTransactions();

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

  const total = useMemo(() => {
    return rows.reduce((sum, r) => {
      const sign = r.direction === "expense" ? -1 : 1; // income/unknown 當 +1（可自行調整 unknown）
      return sum + sign * (Number.isFinite(r.amount) ? r.amount : 0);
    }, 0);
  }, [rows]);

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState({ status: "loading" });
    try{
      const parsedRows = await processTransactionFile(file);
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedRows),
      });
      if(!res.ok) throw new Error("上傳失敗");
      await refresh(); // 這是從 useTransactions 拿到的 refresh
      setState({ status: "idle" });
    }catch(err){
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
              <AddTransactionForm onSuccess={refresh} />
              <div className="mt-4"></div>
              <FileImporter onSuccess={refresh} />
            </div>
          </div>
          <div className="mt-4">
            {rows.length > 0 && (
                <TransactionTable rows={rows} onDataChange={refresh}/>
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
