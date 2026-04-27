"use client";

import { useState, useEffect, useCallback } from "react";
import { type WechatTransactionRow } from "@/app/parser";

export function useTransactions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. 獲取資料
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError("讀取資料失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. 刪除單筆
  const deleteOne = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("刪除失敗");
      setRows((prev) => prev.filter((r) => r._id !== id));
      return true;
    } catch (e) {
      setError("刪除失敗");
      return false;
    }
  };

  // 3. 批量刪除
  const deleteMany = async (ids: string[]) => {
    try {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("批量刪除失敗");
      setRows((prev) => prev.filter((r) => !ids.includes(r._id)));
      return true;
    } catch (e) {
      setError("批量刪除失敗");
      return false;
    }
  };

  // 4. 初次加載
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    rows,
    setRows, // 方便手動新增或解析 CSV 後立即更新
    loading,
    error,
    refresh,
    deleteOne,
    deleteMany,
  };
}