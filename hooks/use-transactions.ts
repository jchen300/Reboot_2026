"use client";
import { useAuth } from "@/context/AuthContext"; // 💡 導入 Auth
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";

export function useTransactions(page = 1, searchQuery = "") {
    const { token,loading } = useAuth();

    const limit = 10; // 每頁顯示的筆數
    const url = `/api/transactions?page=${page}&limit=${limit}&q=${searchQuery}`;
    const { data, error, mutate, isLoading } = useSWR(
        (!loading && token) ? [url, token] : null, // 這裡也要同步改
        fetcher
    );
    
    // 2. 刪除單筆
    const deleteOne = async (id: string) => {
        try {
            const res = await fetch(`/api/transactions?id=${id}`, { 
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` } // 💡 建議補上 Auth
            });
            if (!res.ok) throw new Error("刪除失敗");
            // 💡 刪除成功後，叫 SWR 重新抓取數據，畫面會自動更新
            mutate(); 
            return true;
        } catch (e) {
            return false;
        }
    };

    

    // 3. 批量刪除
    const deleteMany = async (ids: string[]) => {
        try {
        const res = await fetch("/api/transactions", {
            method: "DELETE",
            headers: { 
                "Content-Type": "application/json" ,
                "Authorization": `Bearer ${token}`  
            },
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error("批量刪除失敗");
        mutate();
        return true;
        } catch (e) {
        return false;
        }
    };

    return {
        rows:data?.data || [], // 💡 從 API 回傳的資料結構中取出 rows
        loading:isLoading || loading,
        pagination: data?.pagination,
        summary:data?.summary,
        error,
        refresh:mutate,
        deleteOne,
        deleteMany,
    };
    }