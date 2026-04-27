import { NextResponse } from "next/server";

import { getTransactionsCollection, type Direction, type TransactionDoc } from "@/models/transaction";
import { parseLocalDateTime } from "@/lib/date";

export async function GET() {
  const col = await getTransactionsCollection();
  const items = await col.find({}).sort({ tradeTime: -1 }).limit(500).toArray();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const col = await getTransactionsCollection();

    // 情況 A：如果是陣列（來自 CSV 批量上傳）
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ message: "Empty data" }, { status: 400 });
      }

      // 預處理資料：確保時間格式正確並添加 metadata
      const docs: TransactionDoc[] = body.map((item) => ({
        tradeTime: new Date(item.tradeTime), // 確保轉為 Date 物件
        product: String(item.product || "").trim(),
        amount: Number(item.amount),
        direction: item.direction || "unknown",
        source: "import", // 標記為匯入
        createdAt: new Date(),
      }));
      
      let result;
      try {
        result = await col.insertMany(docs, { ordered: false });
      } catch (e: any) {
        // e.code 11000 是重複鍵錯誤，這裡可以選擇忽略它
        console.log(`忽略了 ${e.writeErrors?.length || 0} 筆重複數據`);
      }
      return NextResponse.json({ 
        success: true, 
        count: result?.insertedCount 
      });
    }

    // 情況 B：如果是單個物件（來自手動新增）
    const doc: TransactionDoc = {
      tradeTime: body.tradeTime ? new Date(body.tradeTime) : new Date(),
      product: String(body.product || "").trim(),
      amount: Number(body.amount),
      direction: body.direction || "unknown",
      source: "manual",
      createdAt: new Date(),
    };

    const res = await col.insertOne(doc);
    return NextResponse.json({ _id: res.insertedId, ...doc });

  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }
}