import { getUserCollection } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1]; // 預期格式: "Bearer user_001"
  
  if (!token) return null;
  
  const userCollection = await getUserCollection();

  const dbUser = await userCollection.findOne({ _id: token } as any);

  if (!dbUser) {
    // 💡 這裡很關鍵：印出資料庫裡所有用戶，看看 ID 到底長什麼樣
    const allUsers = await userCollection.find().toArray();
  }

  // 實務上這裡會是 jwt.verify(token)，目前我們直接查資料庫
  return await userCollection.findOne({ _id: token as any });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "用戶不存在" }, { status: 404 });
    }

    // 3. 回傳完整數據（包含 profile 和 settings）
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}