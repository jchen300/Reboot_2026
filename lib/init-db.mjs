// init-db.mjs
import { MongoClient } from 'mongodb';

// 你的 MongoDB 連線字串，通常本地端是這個
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// 你的資料庫名稱
const dbName = 'wechat_tracker'; 

async function main() {
  try {
    await client.connect();
    console.log('✅ 成功連接至 MongoDB');

    const db = client.db(dbName);

    // 1. 建立 users 集合
    const usersCollection = db.collection('users');

    // 2. 準備測試用戶數據
    const mockUsers = [
      {
        _id: "user_001",
        username: "測試員A",
        email: "a@test.com",
        profile: { hasPendingAI: false, customCategories: ["餐飲", "交通"] },
        createdAt: new Date()
      },
      {
        _id: "user_002",
        username: "測試員B",
        email: "b@test.com",
        profile: { hasPendingAI: true, customCategories: ["工作", "投資"] },
        createdAt: new Date()
      }
    ];

    // 3. 執行插入動作 (使用 upsert 邏輯，避免重複執行時報錯)
    for (const user of mockUsers) {
      await usersCollection.updateOne(
        { _id: user._id }, 
        { $set: user }, 
        { upsert: true }
      );
      console.log(`👤 用戶 ${user.username} 已就緒`);
    }

    // 4. (選填) 為舊的交易紀錄加上預設的 userId
    // 這樣你原本錄入的資料才不會因為沒有 userId 而「消失」
    const result = await db.collection('transactions').updateMany(
      { userId: { $exists: false } }, 
      { $set: { userId: "user_001" } }
    );
    console.log(`📦 已更新 ${result.modifiedCount} 筆舊交易紀錄至 user_001`);

    console.log('✨ 資料庫初始化完成！');
  } catch (err) {
    console.error('❌ 發生錯誤:', err);
  } finally {
    await client.close();
  }
}

main();