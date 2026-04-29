// components/Sidebar.tsx
"use client";
import { useAuth } from '@/context/AuthContext'; 
import { usePathname } from 'next/navigation';

import Link from 'next/link';

export function Sidebar() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) return <div className="w-64 bg-gray-900" />; // 載入中狀態

  // 封裝導覽按鈕樣式
  const navItemStyle = (path: string) => `
    block p-3 rounded transition-colors
    ${pathname === path ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}
  `;

  return (
    <div className="flex flex-col h-full text-white">
      <div className="p-6 text-xl font-bold">我的記帳 App</div>
      
      <nav className="flex-1 px-4 space-y-2">
       <Link href="/" className={navItemStyle('/')}>
          明細列表
        </Link>
        <Link href="/analysis" className={navItemStyle('/analysis')}>
          圖表分析
        </Link>
      </nav>

      {/* 底部顯示用戶資訊 */}
      <div className="p-4 border-t border-gray-800">
        {user ? (
          <div className="flex items-center gap-3">
            <img src={user.avatar} className="w-8 h-8 rounded-full" />
            <span>{user.name}</span>
          </div>
        ) : (
          <button>登入</button>
        )}
      </div>
    </div>
  );
}