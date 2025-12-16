"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    console.log("DashboardLayout auth check:", { loading, user: user?.email });
    // TEMPORARY DEBUG: Disable auto-redirect to inspect state
    // if (!loading && !user) {
    //   console.log("Redirecting to login from DashboardLayout");
    //   router.push("/login");
    // }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p>Loading dashboard...</p>
        <p className="text-xs text-gray-500">Auth Loading: {loading.toString()}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Debug: Not Authenticated</h1>
        <p>The application thinks you are not logged in.</p>
        <div className="text-left bg-slate-100 p-4 rounded text-xs font-mono mb-4">
          <p>Loading: {loading.toString()}</p>
          <p>User: {user ? "Present" : "Null"}</p>
        </div>
        <button 
          onClick={() => router.push("/login")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 mt-2"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
