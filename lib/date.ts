export function parseLocalDateTime(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;

  // Accept:
  // - "YYYY-MM-DD HH:mm:ss"
  // - "YYYY-MM-DDTHH:mm:ss"
  // - "YYYY-MM-DD HH:mm"
  // - "YYYY-MM-DDTHH:mm"
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const sec = m[6] ? Number(m[6]) : 0;

  const dt = new Date(y, mo, d, h, mi, sec);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

