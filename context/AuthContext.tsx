// context/AuthContext.tsx
"use client"; // 💡 必須加在第一行！
import React, { createContext, useContext, useState, useEffect, use } from 'react';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 模擬 Token (之後可以存在 localStorage)
  const [token, setToken] = useState<string | null>(null); // 💡 初始值給 null 
  useEffect(() => {
    // 模擬從 localStorage 或是伺服器獲取 token 的延遲
    const timer = setTimeout(() => {
        setToken("user_001"); // 💡 100ms 後才給值，這會觸發 token 的「變化」
        setLoading(false);
    }, 100); 

    return () => clearTimeout(timer);
  }, []);


 useEffect(() => {
  console.log("AuthProvider useEffect 執行中，Token:", token);
  
   // 模擬從 API 獲取用戶資料 
  fetch('/api/user', { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => {
      setUser(data);
    })
    .catch(err => console.error(err))
    .finally(() => {
      setLoading(false); // 💡 確保這一行一定會執行！
    });
}, []);

  return (
    <AuthContext.Provider value={{ user, token, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);