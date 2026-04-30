"use client";

import { useTransactions } from "@/hooks/use-transactions";
import { TransactionTable } from "@/app/components/TransactionTable";
import { AddTransactionForm } from "@/app/components/AddTransactionForm";
import { FileImporter } from "@/app/components/FileImporter";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function TransactionPage() {
  const { loading } = useAuth();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  // 💡 現在數據獲取是自動化的，不再需要依賴 useEffect 手動 refresh
  const { rows, pagination, loading: dataLoading, refresh } = useTransactions(page, searchQuery);

  // 如果正在驗證身分，顯示簡單的加載狀態
  if (loading) {
    return <div className="p-10 text-center text-zinc-400">驗證身分中...</div>;
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="space-y-6">
          
          {/* 標題與操作區 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <h1 className="text-xl font-bold tracking-tight text-zinc-800">
              帳單管理系統
            </h1>
            <div className="relative">
                <input 
                  type="text"
                  placeholder="搜尋描述或分類..."
                  className="w-full sm:w-64 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); // 搜尋時重置回第一頁
                  }}
                />
              </div>
            
            {/* 💡 當新增成功後，呼叫 refresh (mutate) 讓 SWR 更新全站數據 */}
            <AddTransactionForm onSuccess={refresh} />
            
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-2">批量匯入</p>
              <FileImporter onSuccess={refresh} />
            </div>
          </div>

          {/* 數據列表區 */}
          <div className="mt-4">
            {dataLoading && rows?.length === 0 ? (
              <div className="p-10 text-center text-zinc-400">讀取數據中...</div>
            ) : (
              <TransactionTable rows={rows} onDataChange={refresh} />
              
            )}
            {/* --- 分頁按鈕 --- */}
                <div className="flex items-center justify-between px-2 py-4">
                  <p className="text-sm text-zinc-500">
                    共 {pagination?.total || 0} 筆紀錄
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || dataLoading}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-30 transition-colors"
                    >
                      上一頁
                    </button>
                    
                    <span className="text-sm font-semibold px-2">
                      {page} / {pagination?.totalPages || 1}
                    </span>

                    <button
                      onClick={() => setPage(p => Math.min(pagination?.totalPages || 1, p + 1))}
                      disabled={page >= (pagination?.totalPages || 1) || dataLoading}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-30 transition-colors"
                    >
                      下一頁
                    </button>
                  </div>
                </div>
          </div>

        </div>
      </div>
    </main>
  );
}