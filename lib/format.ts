// lib/format.ts

export function formatDateTime(dateInput: string | Date | null | undefined) {
  if (!dateInput) return "--";

  const date = new Date(dateInput);
  
  // 檢查是否為無效日期
  if (isNaN(date.getTime())) return "--";

  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, "0");
  const D = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");

  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}