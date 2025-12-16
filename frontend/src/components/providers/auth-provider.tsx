"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    console.log("AuthProvider: Setting up listener");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("AuthProvider: Auth state changed", { 
        email: user?.email, 
        uid: user?.uid,
        isAnonymous: user?.isAnonymous 
      });
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
