"use client";

import { useEffect } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { TransactionTable } from "@/app/components/TransactionTable"; // 💡 確認路徑正確
import { AddTransactionForm } from "@/app/components/AddTransactionForm";
import { FileImporter } from "@/app/components/FileImporter";
import { useAuth } from "@/context/AuthContext";

export default function Page() {
  const { token, loading: authLoading } = useAuth();
  
  // 假設 useTransactions 內部會根據傳入的 token 進行 fetch
  const { rows, loading: dataLoading, refresh } = useTransactions();

  // 頁面載入或 Token 改變時刷新數據
  useEffect(() => {

    if (!authLoading && token) {
      refresh();
    }
  }, [token, authLoading, refresh]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="space-y-6">
          
          {/* 標題與操作區 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <h1 className="text-xl font-bold tracking-tight text-zinc-800">
              帳單管理系統
            </h1>
            
            {/* 新增表單 */}
            <AddTransactionForm onSuccess={refresh} />
            
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-2">批量匯入</p>
              <FileImporter onSuccess={refresh} />
            </div>
          </div>

          {/* 數據列表區 */}
          <div className="mt-4">
            
            <TransactionTable rows={rows} onDataChange={refresh} />
    
          </div>

        </div>
      </div>
    </main>
  );
}