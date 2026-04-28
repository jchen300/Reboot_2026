// app/layout.tsx
import "./globals.css"; // 確保導入你的 CSS
import { AuthProvider } from "@/context/AuthContext";
import { Inter } from "next/font/google";
import { Navbar } from "@/app/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AI 記帳助手",
  description: "個人化微信帳單管理系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        {/* 💡 這裡最關鍵：所有組件都必須在 Provider 內部 */}
        <AuthProvider>
          <Navbar /> {/* 💡 放在這裡，所有頁面都會顯示 Navbar */}
          <div className="min-h-screen bg-zinc-50">
            {/* 你可以在這裡放 Navbar，它也會自動獲得 Auth 狀態 */}
            <main className="mx-auto max-w-5xl p-4">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}