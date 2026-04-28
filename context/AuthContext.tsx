// context/AuthContext.tsx
"use client"; // 💡 必須加在第一行！
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 模擬 Token (之後可以存在 localStorage)
  const token = "user_001"; 

 useEffect(() => {
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