import { NextResponse } from "next/server";
import { getTransactionsCollection } from "@/lib/mongodb";
import { batchClassify } from "@/lib/ai-classifier";

export async function POST() {
  try {
    const col = await getTransactionsCollection();
    
    // 1. 撈出所有 aiStatus 為 failed 的紀錄
    const failedItems = await col.find({ aiStatus: "failed" }).toArray();

    if (failedItems.length === 0) {
      return NextResponse.json({ success: true, message: "沒有需要重新分類的項目" });
    }

    // 2. 提取商品名稱進行 AI 分類 (同樣建議分組處理，這裡簡化演示)
    const productNames = failedItems.map(item => item.product);
    const newCategories = await batchClassify(productNames);

    // 3. 逐筆更新資料庫
    const updatePromises = failedItems.map((item, index) => {
      const newCat = newCategories[index];
      return col.updateOne(
        { _id: item._id },
        { 
          $set: { 
            category: newCat || "錯誤",
            aiStatus: (newCat && newCat !== "錯誤") ? "success" : "failed" 
          } 
        }
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      success: true, 
      count: failedItems.length,
      message: `成功更新 ${failedItems.length} 筆資料` 
    });

  } catch (error) {
    console.error("重新分類失敗:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}