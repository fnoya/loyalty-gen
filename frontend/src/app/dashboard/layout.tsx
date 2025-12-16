"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const isMountedRef = useRef(false);

  // Track mounting and handle redirect in a single effect
  useEffect(() => {
    isMountedRef.current = true;

    // Only redirect after component has mounted and auth state is resolved
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // During SSR or while loading, show loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect on client
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
