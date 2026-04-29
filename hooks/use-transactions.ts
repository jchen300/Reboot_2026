"use client";
import { useAuth } from "@/context/AuthContext"; // 💡 導入 Auth
import useSWR from "swr";

export function useTransactions() {
    const { token } = useAuth();
    const { data, error, isLoading, mutate } = useSWR(
        token ? ['/api/transactions', token] : null
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
        rows:data,
        loading:isLoading,
        error,
        refresh:mutate,
        deleteOne,
        deleteMany,
    };
    }