import { MongoClient } from "mongodb";

export interface UserDocument {
  _id: string; // 強制指定 _id 是 string 而不是 ObjectId
  username: string;
  // ... 其他欄位
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getUserCollection() {
  const client = await clientPromise;
  const db= client.db("wechat_tracker");
  return db.collection("users");
}

export async function getTransactionsCollection() {
  const client = await clientPromise; // 確保你有這個 Promise
  const db = client.db("wechat_tracker");
  return db.collection("transactions");
}

export default clientPromise;


