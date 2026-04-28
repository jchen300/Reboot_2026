"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

interface AddTransactionFormProps {
  onSuccess: () => Promise<void>;
}

export function AddTransactionForm({ onSuccess }: AddTransactionFormProps) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    // 直接從 FormData 提取值
    const product = formData.get("product") as string;
    const amount = formData.get("amount") as string;
    const category = formData.get("category") as string;
    const tradeTime = formData.get("tradeTime") as string;

    // 基本驗證
    if (!product || !amount) return alert("請填寫商品與金額");
    if (!token) return alert("身份驗證失效，請重新整理");

    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          product: product.trim(),
          amount: Number(amount),
          category: category,
          tradeTime: tradeTime.trim() || formatDateTime(new Date()),
          direction: "expense",
        }),
      });

      if (!res.ok) throw new Error("儲存失敗");

      form.reset();      // 💡 一鍵清空所有輸入框
      await onSuccess(); // 重新整理列表
      
    } catch (err) {
      alert(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-5"
    >
      {/* 1. 交易時間 - 使用 name 屬性替代 state */}
      <div className="sm:col-span-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">交易時間</label>
        <input
          name="tradeTime"
          placeholder="現在時間"
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-400"
        />
      </div>

      {/* 2. 商品內容 */}
      <div className="sm:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">商品內容</label>
        <input
          name="product"
          required
          placeholder="例如：咖啡、午餐..."
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-400"
        />
      </div>

      {/* 3. 動態分類 */}
      <div className="sm:col-span-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">分類</label>
        <select
          name="category"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-400"
        >
          {user?.profile?.customCategories?.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 4. 金額與提交 */}
      <div className="sm:col-span-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">金額</label>
        <div className="mt-1 flex gap-2">
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            placeholder="0"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:bg-zinc-300 transition-all shadow-sm"
          >
            {loading ? "..." : "新增"}
          </button>
        </div>
      </div>
    </form>
  );
}