// app/layout.tsx
import "./globals.css"; // 確保導入你的 CSS
import { AuthProvider } from "@/context/AuthContext";
import { Inter } from "next/font/google";
import { Navbar } from "@/app/components/NavBar";
import { Sidebar } from "@/app/components/Sidebar";
import { Providers } from "@/app/providers";

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
          <Providers>
            <div className="flex h-screen overflow-hidden">
              {/* 左側導航欄 - 它是佈局的一部分 */}
              <aside className="hidden md:flex w-64 flex-col bg-gray-900">
                <Sidebar /> 
              </aside>
              {/* 右側主要內容 */}
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}