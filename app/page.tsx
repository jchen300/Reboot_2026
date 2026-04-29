"use client";

import { useTransactions } from "@/hooks/use-transactions";
import { TransactionTable } from "@/app/components/TransactionTable";
import { AddTransactionForm } from "@/app/components/AddTransactionForm";
import { FileImporter } from "@/app/components/FileImporter";
import { useAuth } from "@/context/AuthContext";

export default function Page() {
  const { authLoading } = useAuth();
  
  // 💡 現在數據獲取是自動化的，不再需要依賴 useEffect 手動 refresh
  const { rows, loading: dataLoading, refresh } = useTransactions();

  // 如果正在驗證身分，顯示簡單的加載狀態
  if (authLoading) {
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
          </div>

        </div>
      </div>
    </main>
  );
}