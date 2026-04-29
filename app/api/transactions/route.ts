export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from "next/server";

import { getTransactionsCollection, type Direction, type TransactionDoc } from "@/models/transaction";
import { ObjectId } from "mongodb";
import { batchClassify } from "@/lib/ai-classifier";


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// 工具函式：分組陣列
const chunkArray = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

// 工具函式：生成指紋（用於去重）
const getFingerprint = (item: any) => {
  const time = new Date(item.tradeTime).getTime();
  const product = String(item.product || "").trim();
  const amount = Number(item.amount);
  return `${time}-${product}-${amount}`;
};

export async function GET(req: NextRequest) {
  try {
    // 1. 從 Header 拿到 Authorization: Bearer user_001
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1]; // 這裡會拿到 "user_001"

    if (!token) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const collection = await getTransactionsCollection();

    // 2. 關鍵：查詢時必須帶上 userId
    const transactions = await collection
      .find({ userId: token } as any) // 使用 token 作為 userId 過濾
      .sort({ tradeTime: -1 })
      .toArray();

    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const col = await getTransactionsCollection();
    
    // 統一轉為陣列處理，簡化邏輯
    const rawItems = Array.isArray(body) ? body : [body];

    // 1. 數據庫去重比對
    const existingDocs = await col.find({
      $or: rawItems.map(item => ({
        tradeTime: new Date(item.tradeTime),
        product: String(item.product).trim(),
        amount: Number(item.amount)
      }))
    }).toArray();

    const existingFingerprints = new Set(existingDocs.map(getFingerprint));

    // 過濾掉重複項
    const newItems = rawItems.filter(item => !existingFingerprints.has(getFingerprint(item)));
  
    if (newItems.length === 0) {
      return NextResponse.json({ 
        success: true, 
        count: 0, 
        message: "資料已存在，無需重複匯入" 
      });
    }

    // 2. AI 分類處理 (分組併發)
    const chunks = chunkArray(newItems, 50);
    const finalDocs = []; // 用來存放所有處理完的數據

    // 使用 for...of 進行「序列化（串行）」處理
    for (const [index,chunk] of chunks.entries()) {
      const productNames = chunk.map(item => item.product);
      
      // 等待當前這一組 AI 分類完成後，才進入下一組
      const categories = await batchClassify(productNames);

      const processedChunk = chunk.map((item, index) => {
      const cat = categories[index];
      const isFailed = !cat || cat === "錯誤";  
      return {
        tradeTime: new Date(item.tradeTime),
        product: String(item.product || "").trim(),
        amount: Number(item.amount),
        direction: item.direction || "expense", // 預設為支出
        source: (Array.isArray(body) ? "import" : "manual") as any,
        category: categories[index] || "其他支出",
        aiStatus: isFailed? true: false, // 這裡可以根據 batchClassify 的結果來標記
        createdAt: new Date(),
    }});
      if (index < chunks.length - 1) {
        await sleep(3000); // 停止 3 秒，這能大幅降低 429 報錯機率
      }

      finalDocs.push(...processedChunk);
    }

    // 3. 寫入資料庫
    const result = await col.insertMany(finalDocs);
    return NextResponse.json({
      success: true,
      count: result.insertedCount,
      skipped: rawItems.length - newItems.length,
      data: finalDocs // 回傳處理後的資料給前端
    });

  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "處理失敗" }, { status: 500 });
  }
}


export async function DELETE(req: Request) {
  try {
    const col = await getTransactionsCollection();
    
    // 嘗試從 URL 獲取單筆 ID (?id=xxx)
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // 1. 處理單筆刪除
    if (id) {
      const result = await col.deleteOne({ _id: new ObjectId(id) });
      return NextResponse.json({ 
        success: result.deletedCount === 1,
        message: result.deletedCount === 1 ? "刪除成功" : "找不到該筆資料"
      });
    }

    // 2. 處理批量刪除 (從 Body 獲取 ids 陣列)
    const body = await req.json().catch(() => ({}));
    const { ids } = body as { ids: string[] };

    if (Array.isArray(ids) && ids.length > 0) {
      const objectIds = ids.map((i) => new ObjectId(i));
      const result = await col.deleteMany({ _id: { $in: objectIds } });
      return NextResponse.json({ 
        success: true, 
        count: result.deletedCount,
        message: `成功刪除 ${result.deletedCount} 筆資料`
      });
    }

    return NextResponse.json({ error: "請提供要刪除的 ID" }, { status: 400 });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "刪除操作失敗" }, { status: 500 });
  }
}