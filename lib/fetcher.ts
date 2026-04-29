// lib/fetcher.ts
export const fetcher = async ([url, token]: [string, string | null]) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = new Error('請求失敗');
    // 可以把錯誤資訊傳給 SWR
    (error as any).info = await res.json();
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
};