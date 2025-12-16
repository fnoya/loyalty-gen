'use client';

import { auth } from "@/lib/firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getHeaders() {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getHeaders();
  const url = `${API_URL}${endpoint}`;
  console.log(`API Request: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} for ${url}`);
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Details:", errorData);
      throw new Error(errorData.error?.message || "API request failed");
    }

    if (response.status === 204) return null as T;
    return response.json();
  } catch (error) {
    console.error("API Request Failed (Network/Fetch Error):", error);
    throw error;
  }
}
