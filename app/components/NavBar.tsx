"use client";

import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, loading } = useAuth();

  return (
    <nav className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="text-lg font-bold text-zinc-900">AI 記帳助手</div>
        
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {/* 顯示目前模擬的用戶名 */}
              <span className="text-sm font-medium text-zinc-700">
                👤 {user.username}
              </span>
              {/* 顯示 AI 狀態標記 */}
              {user.profile?.hasPendingAI && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" title="有待處理的 AI 帳單" />
              )}
            </div>
          ) : (
            <span className="text-sm text-zinc-400">未登入</span>
          )}
        </div>
      </div>
    </nav>
  );
}