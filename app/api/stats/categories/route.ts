// app/api/stats/categories/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1]; // 拿到 user_001
  console.log("後端收到的 Token (categories):", token); // 👈 加入這行除錯

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("wechat_tracker"); // 確保這是你的資料庫名稱

    const stats = await db.collection("transactions").aggregate([
      { 
        $match: { 
          userId: token, 
          direction: 'expense' // 只統計支出
        } 
      },
      {
        $group: {
          _id: "$category", // 根據分類分組
          value: { $sum: "$amount" } // 加總金額
        }
      },
      {
        $project: {
          name: "$_id", // 為了配合 Recharts，把 _id 改名為 name
          value: 1,
          _id: 0
        }
      },
      { $sort: { value: -1 } } // 從高到低排序
    ]).toArray();

    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}