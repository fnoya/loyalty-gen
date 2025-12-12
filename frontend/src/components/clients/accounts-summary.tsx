"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api";
import { AllBalancesResponse, LoyaltyAccount } from "@/types/loyalty";

interface AccountsSummaryProps {
  clientId: string;
}

export function AccountsSummary({ clientId }: AccountsSummaryProps) {
  const [balances, setBalances] = useState<AllBalancesResponse | null>(null);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch balances and accounts in parallel
      const [balancesData, accountsData] = await Promise.all([
        apiRequest<AllBalancesResponse>(`/clients/${clientId}/balance`),
        apiRequest<LoyaltyAccount[]>(`/clients/${clientId}/accounts`),
      ]);

      setBalances(balancesData);
      setAccounts(accountsData);
    } catch (err: any) {
      console.error("Failed to fetch accounts data:", err);
      // Always show Spanish-friendly error message per UI-UX-GUIDELINES
      setError("Error al cargar los datos de las cuentas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuentas de Lealtad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuentas de Lealtad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuentas de Lealtad</CardTitle>
          <CardDescription>No hay cuentas de lealtad para este cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">El cliente aún no tiene cuentas de lealtad.</p>
        </CardContent>
      </Card>
    );
  }

  const totalPoints = Object.values(balances || {}).reduce((sum, points) => sum + points, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Resumen de Cuentas de Lealtad
        </CardTitle>
        <CardDescription>
          {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"} · {totalPoints.toLocaleString()} puntos totales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accounts.map((account) => {
            const balance = balances?.[account.id] || 0;
            return (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
              >
                <div>
                  <p className="font-medium">{account.account_name}</p>
                  <p className="text-xs text-slate-500">ID: {account.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{balance.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">puntos</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
