// app/providers.tsx (建議拆分出來)
"use client";

import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from "@/context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{
        fetcher, // 💡 所有的 useSWR 都會默認使用這個 fetcher
        revalidateOnFocus: false, // 💡 視窗聚焦時不自動重抓 (看你需求)
        dedupingInterval: 3000,   // 💡 3秒內重複的請求直接併發處理
        shouldRetryOnError: false, // 💡 失敗後不反覆重試，減少 API 負擔
      }}
    >
      {children}
    </SWRConfig>
  );
}