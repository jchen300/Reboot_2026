import type { Collection, Db, ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";

export type Direction = "income" | "expense" | "unknown";
export type Source = "manual" | "import";

export type TransactionDoc = {
  _id?: ObjectId;
  tradeTime: Date;
  product: string;
  amount: number;
  direction: Direction;
  source: Source;
  importBatchId?: string;
  filename?: string;
  createdAt: Date;
  category: string;
};

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(); // db name comes from MONGODB_URI path
}

export async function getTransactionsCollection(): Promise<Collection<TransactionDoc>> {
  const db = await getDb();
  return db.collection<TransactionDoc>("transactions");
}

