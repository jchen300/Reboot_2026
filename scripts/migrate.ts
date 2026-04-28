// scripts/migrate.ts
import * as dotenv from "dotenv";
import path from "path";

// 1. 第一步：加載變數
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

// 2. 驗證變數是否真的進來了
if (!process.env.MONGODB_URI) {
  console.error("❌ 錯誤：無法從 .env.local 讀取 MONGODB_URI");
  console.log("檢查路徑：", envPath);
  process.exit(1);
}

// 3. 第二步：使用動態 import 載入資料庫模型
// 這樣可以確保在執行 getTransactionsCollection 之前，環境變數已經就緒
async function migrate() {
  try {
    console.log("🚀 正在連線至資料庫...");
    
    // 動態加載，避開頂層 import 提升問題
    const { getTransactionsCollection } = await import("../models/transaction");
    const col = await getTransactionsCollection();
    
    const count = await col.countDocuments();
    console.log(`✅ 連線成功！目前有 ${count} 筆交易。`);
    const result = await col.updateMany(
      { category: { $exists: false } }, 
      { $set: { category: "未分類" } }
    );
    console.log(`✅ 處理完成！共更新了 ${result.modifiedCount} 筆數據。`);
    // 這裡可以開始寫你的 AI 分類邏輯...
    
  } catch (error) {
    console.error("❌ 執行出錯:", error);
  } finally {
    process.exit(0);
  }
}

migrate();