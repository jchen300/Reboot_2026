import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import clientPromise from "@/lib/mongodb";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    // --- 1. 安全校驗 (測試期) ---
    const TEST_TOKEN = "123"; 
    const TEST_USER_ID = "user_001"; // 這裡先硬編一個 user ID，之後會改成從驗證系統拿

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (token !== TEST_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // --- 2. 接收圖片檔案 (FormData) ---
    const formData = await req.formData();
    const file = formData.get("file") as File; // 快捷指令裡的 Key 要填 file

    if (!file) {
      return NextResponse.json({ error: "未提供圖片檔案" }, { status: 400 });
    }

    // 將檔案轉為 Buffer 再轉 Base64 供 Gemini SDK 使用
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // --- 3. 調用 Gemini 3.1 Flash-Lite ---
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview" 
    });

    const prompt = `
      你是一個專業的記帳助手。請分析這張交易截圖，並精確提取以下資訊：
      {
        "amount": 數字,
        "merchant": "商戶名稱",
        "date": "YYYY-MM-DD HH:mm:ss",
        "category": "分類"
      }
      請直接回傳 JSON 格式，不要包含任何額外的解釋文字。
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
    ]);

    const text = result.response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const aiData = JSON.parse(cleanJson);

    // 6. 正式寫入資料庫
    const client = await clientPromise;
    const db = client.db("your_db_name"); // 請確保這是你正確的資料庫名稱

    const newTransaction = {
        amount: Number(aiData.amount),      // 確保是數字
        merchant: aiData.merchant || "未知商戶",
        date: new Date(aiData.date),        // 轉為 Date 對象
        category: aiData.category || "其他",
        userId: TEST_USER_ID,               // 測試期先用這個，之後改成 user._id
        source: "AI_VISION_AUTO",
        createdAt: new Date(),
    };


    // 終端機打印結果，方便你一邊看電腦一邊測手機
    console.log("🚀 AI 辨識成功:", newTransaction);

    // --- 4. 回傳給手機 (暫時不入庫，僅觀看結果) ---
    return NextResponse.json({
        success: true,
        message: "✅ 記帳成功" 
    });

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return NextResponse.json({ error: "AI 辨識失敗" }, { status: 500 });
  }
}