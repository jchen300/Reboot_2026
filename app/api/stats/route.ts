// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  const client = await clientPromise;
  const db = client.db("wechat-tracker");
  
  // 假設我們要抓取當前用戶、當前月份的數據
  const stats = await db.collection("transactions").aggregate([
    {
      $match: { 
        userId: "user_001", // 記得之後換成動態 id
        type: "expense"         // 只看支出
      }
    },
    {
      $group: {
        _id: "$category",       // 按分類分組
        totalAmount: { $sum: "$amount" } // 計算總金額
      }
    },
    { $sort: { totalAmount: -1 } } // 從花最多的排到最少
  ]).toArray();

  return NextResponse.json(stats);
}