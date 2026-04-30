// app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  // 這裡直接呼叫 redirect，它會告訴瀏覽器去另一個路徑
  redirect('/transactions');
  
  // 雖然這行不會執行到，但 Next.js 要求組件要有回傳值
  return null;
}