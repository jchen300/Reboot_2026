import { NextResponse } from "next/server";

import { getTransactionsCollection, type Direction, type TransactionDoc } from "@/models/transaction";
import { parseLocalDateTime } from "@/lib/date";

type ImportRow = {
  tradeTime: string;
  product: string;
  amount: number;
  direction?: Direction;
  amountRaw?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    filename: string;
    rows: ImportRow[];
  }>;

  const filename = String(body.filename ?? "").trim();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }

  const importBatchId =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const now = new Date();
  const docs: TransactionDoc[] = [];

  for (const r of rows) {
    const product = String(r.product ?? "").trim();
    const amount = Number(r.amount);
    if (!product) continue;
    if (!Number.isFinite(amount)) continue;

    const tradeTime = parseLocalDateTime(String(r.tradeTime ?? "")) ?? now;
    const direction: Direction = r.direction ?? "unknown";

    docs.push({
      tradeTime,
      product,
      amount,
      direction,
      source: "import",
      importBatchId,
      filename: filename || undefined,
      createdAt: now,
    });
  }

  if (docs.length === 0) {
    return NextResponse.json({ error: "no valid rows" }, { status: 400 });
  }

  const col = await getTransactionsCollection();
  const res = await col.insertMany(docs, { ordered: false });

  return NextResponse.json({
    importBatchId,
    insertedCount: res.insertedCount,
  });
}

