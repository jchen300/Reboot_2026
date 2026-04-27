// components/AddTransactionForm.tsx
// 這個 component 是一個表單，讓使用者可以手動新增一筆交易紀錄
"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";

interface AddTransactionFormProps {
    onSuccess: () => Promise<void>; // 成功後通知 Page 刷新資料
}


export function AddTransactionForm({ onSuccess}: AddTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [tradeTime, setTradeTime] = useState("");
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("");

  const handleAddManualRow = async () => {
    if (!product || !amount) return alert("請填寫商品與金額");
    
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeTime: tradeTime.trim() || formatDateTime(new Date()),
          product: product.trim(),
          amount: Number(amount),
          direction: "expense",
        }),
      });

      if (!res.ok) throw new Error("儲存失敗");

      // 1. 清空自己的輸入框
      setProduct("");
      setAmount("");
      setTradeTime("");
      
      // 2. 通知 Page 刷新列表（呼叫 refresh）
      await onSuccess(); 
      
    } catch (err) {
      alert(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4">
      <div className="sm:col-span-1">
        <label className="text-xs font-medium text-zinc-600">交易時間</label>
        <input
          value={tradeTime}
          onChange={(e) => setTradeTime(e.target.value)}
          placeholder="留空則使用現在"
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-zinc-600">商品</label>
        <input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="午餐 / 咖啡..."
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>
      <div className="sm:col-span-1">
        <label className="text-xs font-medium text-zinc-600">金額</label>
        <div className="mt-1 flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="120"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <button
            onClick={handleAddManualRow}
            disabled={loading}
            className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-400"
          >
            新增
          </button>
        </div>
      </div>
    </div>
  );
}