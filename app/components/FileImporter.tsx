"use client";

import { useState } from "react";
import { processTransactionFile } from "@/lib/file-processor";

interface FileImporterProps {
  onSuccess: () => Promise<void>; // 匯入成功後告訴 Page 刷新
}

export function FileImporter({ onSuccess }: FileImporterProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [filename, setFilename] = useState("");
  const [isReclassifying, setIsReclassifying] = useState(false);
  const handleReclassify = async () => {
    setIsReclassifying(true);
    try {
      const res = await fetch("/api/transactions/reclassify", { method: "POST" });
      if (!res.ok) throw new Error("重新分類失敗");
      await onSuccess();
      alert("重新分類完成");
    } catch (err) {
      alert(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsReclassifying(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setStatus("loading");
    try {
      const parsed = await processTransactionFile(file);
      setPreviewData(parsed);
      setFilename(file.name);
      setStatus("ready");
    } catch (err) {
      alert(err instanceof Error ? err.message : "解析失敗");
      setStatus("idle");
    }
  };

  const onConfirmSave = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewData),
      });

      if (res.ok) {
        await onSuccess();
        setPreviewData([]);
        setStatus("idle");
      }
    } catch (err) {
      alert("儲存失敗");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-zinc-600">
          支援 .csv / .xlsx 格式檔案匯入。
        </span>
         <button
          onClick={handleReclassify}
          disabled={isReclassifying}
          className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${
            isReclassifying ? "bg-gray-400" : "bg-zinc-900 hover:bg-zinc-800"
          }`}
        >
          {isReclassifying ? (
            <>
              <span className="animate-spin">🔄</span> AI 努力思考中...
            </>
          ) : (
            "🔄 重新分類未辨識項目"
          )}
        </button>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800">
          <input type="file" accept=".csv,.xlsx" className="hidden" onChange={onPickFile} />
          {status === "loading" ? "處理中..." : "選擇檔案匯入"}
        </label>
      </div>

      {status === "ready" && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-200 animate-in fade-in slide-in-from-top-2">
          <span className="text-sm text-amber-800">
            檢測到 <b>{filename}</b> 的 {previewData.length} 筆資料
          </span>
          <button
            onClick={onConfirmSave}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            確認匯入
          </button>
        </div>
      )}
    </div>
  );
}