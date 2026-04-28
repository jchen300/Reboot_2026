import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// 1. 強制設置全域代理分發器 (這是 Next.js/Node 內核級別的攔截)
const proxyUrl = "http://127.0.0.1:10794";
const dispatcher = new ProxyAgent({ uri: proxyUrl });
setGlobalDispatcher(dispatcher);
// 你的本地 VPN 端口


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
// 定義分類字典，讓 AI 嚴格遵守
export const CATEGORIES = ["餐飲", "交通", "購物", "休閒", "醫療", "居家", "金融", "其他"];

export async function batchClassify(products: string[],attempt=1): Promise<string[]> {
  const prompt = `
   你是一個專業的財務記帳助手。請將以下商品名稱分類為以下類別之一：
    [餐飲, 交通, 購物, 休閒, 醫療, 居家, 金融, 其他]
    
    請參考以下分類範例（Few-shot）：
    1. "外賣"、"美團"、"星巴克","餐飲",任意食物 -> 餐飲
    2. "乘車"、"地鐵充值"、"停車" -> 交通
    3. "淘寶"、"拼多多"、"美宜佳" -> 購物
    4. "Netflix"、"Steam遊戲"、"電影院" -> 休閒
    5. "藥局"、"掛號費","處方” -> 醫療
    6. "房租"、"水電費","apple" -> 居家
    7. "支付寶-餘額寶收益"、"銀行利息" -> 金融

    待處理商品名稱列表（以逗號分隔）：
    ${products.join(", ")}

    **重要規則：**
    1. 僅輸出分類結果，類別之間用半形逗號分隔。
    2. 輸出的分類數量必須與輸入的商品數量完全一致（目前數量為 ${products.length} 個）。
    3. 如果無法確定，請歸類為 "其他"。
    4. 簡體字也要查詢
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // 處理 AI 可能回傳的換行或空格
    const results = text.split(",").map(s => s.trim());
    return results;
  } catch (error: any) {
    if ((error.status === 503 || error.status === 429) && attempt <= 3) {
      const delay = attempt * 5000; // 第一次等 5秒，第二次等 10秒...
      console.warn(`AI 伺服器忙碌中 (狀態 ${error.status})，${delay/1000} 秒後進行第 ${attempt} 次重試...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return batchClassify(products, attempt + 1); // 遞迴重試
    }
    
    // 如果真的失敗太多次，回傳「其他」避免整個程式崩潰
    console.error("AI 分類最終失敗:", error);
    return products.map(() => "錯誤");
    // console.error("Gemini 分類錯誤:", error);
    // 失敗時回傳同等數量的 "其他支出"
    // return products.map(() => "其他支出");
  }
}