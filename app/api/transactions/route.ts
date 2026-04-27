import { NextResponse } from "next/server";

import { getTransactionsCollection, type Direction, type TransactionDoc } from "@/models/transaction";
import { parseLocalDateTime } from "@/lib/date";
import { ObjectId } from "mongodb";

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