"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { Trash2, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTransactions } from "@/hooks/use-transactions";

interface TransactionTableProps {
  rows: any[];
  onDataChange: () => Promise<void>;
}

export function TransactionTable({ rows=[], onDataChange }: TransactionTableProps) {
  const { deleteOne, deleteMany } = useTransactions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLocalBusy, setIsLocalBusy] = useState(false); // 💡 增加本地的 loading 狀態
  // 1. 計算合計金額 (Memoized 避免不必要重算)
  const total = useMemo(() => {

    return rows.reduce((sum, r) => {
      const sign = r.direction === "income" ? 1 : -1;
      // 💡 確保 r.amount 存在，不然會變成 NaN
      const amount = Number(r.amount) || 0; 
      return sum + sign * amount;
    }, 0);
  }, [rows]);

  // 2. 勾選邏輯
  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? rows.map((r) => r._id) : []);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    );
  };

  // 3. 刪除邏輯 (整合 Hook 與 UI 反饋)
  const handleDelete = async (ids: string[]) => {
    const isBatch = ids.length > 1;
    if (!confirm(isBatch ? `確定要批量刪除 ${ids.length} 筆資料嗎？` : "確定要刪除此筆資料嗎？")) return;
    setIsLocalBusy(true); // 開始動作 
    try{
      const success = isBatch ? await deleteMany(ids) : await deleteOne(ids[0]);
      
      if (success) {
        setSelectedIds([]); // 清空勾選
        await onDataChange(); // 通知父組件刷新
      } else {
        alert("刪除失敗，請稍後再試");
      }
    }finally {
      setIsLocalBusy(false); // 結束動作
    }
  };

  // 4. 行背景色邏輯
  const getRowClass = (dir: string, isSelected: boolean) => {
    if (isSelected) return "bg-blue-50 hover:bg-blue-100";
    return dir === "income" ? "hover:bg-emerald-50/40" : "hover:bg-rose-50/40";
  };

  // 空狀態處理
  if (rows?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/30">
        <AlertCircle size={40} className="mb-3 opacity-20" />
        <p className="text-sm font-medium">目前沒有交易紀錄</p>
        <p className="text-xs opacity-60">嘗試手動新增或匯入微信帳單 CSV</p>
      </div>
    );
  }

  return (
    <div className={`relative space-y-3 ${isLocalBusy ? "pointer-events-none select-none" : ""}`}>
      
      {/* Sticky 工具列 */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md py-3 px-2 border-b border-zinc-100 flex items-center justify-between transition-all rounded-t-xl">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-zinc-400 font-black uppercase tracking-tighter block">Snapshot</span>
            <div className="text-sm text-zinc-600 font-medium">
              <span className="text-zinc-900">{rows?.length}</span> Transactions
            </div>
          </div>

          {/* 批量操作 */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="h-6 w-[1px] bg-zinc-200 mx-1" />
              <button
                onClick={() => handleDelete(selectedIds)}
                disabled={isLocalBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Delete Selected ({selectedIds.length})
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="text-[10px] text-zinc-400 font-black uppercase tracking-tighter block">Net Flow</span>
          <span className={`text-xl font-black tabular-nums tracking-tighter ${total < 0 ? "text-rose-500" : "text-emerald-500"}`}>
            {total >= 0 ? `+${total?.toLocaleString()}` : total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 表格容器 */}
      <div className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-opacity ${isLocalBusy ? "opacity-60" : "opacity-100"}`}>
        <div className="max-h-[60vh] overflow-auto scrollbar-hide">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 bg-zinc-50/80 backdrop-blur-sm z-10">
              <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <th className="border-b border-zinc-100 px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === rows.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                </th>
                <th className="border-b border-zinc-100 px-4 py-4">Timestamp</th>
                <th className="border-b border-zinc-100 px-4 py-4">Item</th>
                <th className="border-b border-zinc-100 px-4 py-4 text-right">Amount</th>
                <th className="border-b border-zinc-100 px-4 py-4 text-center">Category</th>
                <th className="border-b border-zinc-100 px-4 py-4 text-center">Type</th>
                <th className="border-b border-zinc-100 px-4 py-4 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {rows.map((r) => {
                const isSelected = selectedIds.includes(r._id);
                return (
                  <tr key={r._id} className={`${getRowClass(r.direction, isSelected)} transition-colors`}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleOne(r._id, e.target.checked)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-zinc-400 tabular-nums text-[11px]">
                      {formatDateTime(r.tradeTime)}
                    </td>
                    <td className="px-4 py-4 text-zinc-900 font-bold truncate max-w-[180px]">
                      {r.product}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-right font-black tabular-nums ${r.direction === 'income' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                      {r.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        r.category 
                        ? 'bg-zinc-50 text-zinc-600 border-zinc-200' 
                        : 'bg-zinc-100 text-zinc-400 border-zinc-100 italic'
                      }`}>
                        {r.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                        r.direction === 'income' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-rose-100 text-rose-700'
                      }`}>
                        {r.direction === "income" ? "IN" : "OUT"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleDelete([r._id])}
                        disabled={isLocalBusy}
                        className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}