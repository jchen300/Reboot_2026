"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface TransactionTableProps {
  rows: any[];
  onDataChange: () => Promise<void>;
}

export function TransactionTable({ rows, onDataChange }: TransactionTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. 計算合計金額
  const total = useMemo(() => {
    return rows.reduce((sum, r) => {
      const sign = r.direction === "expense" ? -1 : 1;
      return sum + sign * (Number.isFinite(r.amount) ? r.amount : 0);
    }, 0);
  }, [rows]);

  // 2. 背景色邏輯
  const rowBgClass = (dir: string) => {
    if (dir === "income") return "odd:bg-emerald-50 even:bg-emerald-100 hover:bg-emerald-200";
    if (dir === "expense") return "odd:bg-rose-50 even:bg-rose-100 hover:bg-rose-200";
    return "odd:bg-zinc-50 even:bg-white hover:bg-zinc-100";
  };

  // 3. 全選/單選邏輯
  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? rows.map((r) => r._id) : []);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    );
  };

  // 4. 刪除邏輯
  const handleDeleteOne = async (id: string) => {
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      if (res.ok) await onDataChange();
    } catch (err) {
      alert("刪除失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`確定要刪除選中的 ${selectedIds.length} 筆紀錄嗎？`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        await onDataChange();
      }
    } catch (err) {
      alert("批量刪除失敗");
    } finally {
      setIsDeleting(false);
    }
  };

  // 如果沒有數據
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-300 rounded-2xl bg-zinc-50">
        暫無交易紀錄，請嘗試新增或匯入檔案。
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isDeleting ? "opacity-60 pointer-events-none" : ""}`}>
      
      {/* 統計資訊區 */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-900">數據概覽</span>
          <span className="mx-2 text-zinc-300">|</span>
          共 <span className="font-semibold text-zinc-900">{rows.length}</span> 筆交易
        </div>
        <div className="text-sm text-zinc-600">
          收支合計：
          <span className={`font-bold tabular-nums text-base ${total < 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {total > 0 ? `+${total.toLocaleString()}` : total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 批量操作面板 - 僅在選中時顯示 */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium text-rose-800">
            已選取 <span className="font-bold">{selectedIds.length}</span> 筆項目
          </p>
          <button
            onClick={handleDeleteSelected}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm transition-all"
          >
            批量刪除
          </button>
        </div>
      )}

      {/* 表格主體 */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 bg-zinc-50/95 backdrop-blur-sm z-10">
              <tr className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                <th className="border-b border-zinc-200 px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === rows.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                </th>
                <th className="border-b border-zinc-200 px-4 py-3.5">交易時間</th>
                <th className="border-b border-zinc-200 px-4 py-3.5">商品內容</th>
                <th className="border-b border-zinc-200 px-4 py-3.5 text-right">金額</th>
                <th className="border-b border-zinc-200 px-4 py-3.5 text-right">類型</th>
                <th className="border-b border-zinc-200 px-4 py-3.5 text-center">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, idx) => (
                <tr key={r._id || idx} className={`${rowBgClass(r.direction)} transition-colors`}>
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r._id)}
                      onChange={(e) => toggleOne(r._id, e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-zinc-600 tabular-nums">
                    {formatDateTime(r.tradeTime)}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-900 font-medium">
                    {r.product}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold tabular-nums text-zinc-900">
                    {r.amount.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.direction === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {r.direction === "income" ? "收入" : "支出"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => handleDeleteOne(r._id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                      title="刪除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}