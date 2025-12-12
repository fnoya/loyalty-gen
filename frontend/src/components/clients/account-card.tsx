"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";
import { Transaction } from "@/types/transaction";
import { TransactionsList } from "./transactions-list";
import { CreditDebitForm } from "./credit-debit-form";

interface AccountCardProps {
  clientId: string;
  accountId: string;
  accountName: string;
  currentBalance: number;
  onBalanceUpdate?: () => void;
}

export function AccountCard({
  clientId,
  accountId,
  accountName,
  currentBalance: initialBalance,
  onBalanceUpdate,
}: AccountCardProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ data: Transaction[] }>(
        `/clients/${clientId}/accounts/${accountId}/transactions?limit=5`,
      );
      setTransactions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId, accountId]);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  const handleTransactionSuccess = () => {
    // Trigger refetch of transactions
    setRefreshKey((prev) => prev + 1);
    // Notify parent to update balance summary
    onBalanceUpdate?.();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {accountName}
          </CardTitle>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">
              {balance.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">puntos disponibles</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credit/Debit Forms */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <h3 className="font-medium text-sm">Acreditar Puntos</h3>
            </div>
            <CreditDebitForm
              clientId={clientId}
              accountId={accountId}
              type="credit"
              onSuccess={handleTransactionSuccess}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <h3 className="font-medium text-sm">Debitar Puntos</h3>
            </div>
            <CreditDebitForm
              clientId={clientId}
              accountId={accountId}
              type="debit"
              onSuccess={handleTransactionSuccess}
            />
          </div>
        </div>

        <Separator />

        {/* Recent Transactions */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Transacciones Recientes</h3>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <TransactionsList transactions={transactions} limit={5} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
