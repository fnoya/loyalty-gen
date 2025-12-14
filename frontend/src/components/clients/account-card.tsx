"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api";
import { Transaction } from "@/types/transaction";
import { TransactionsList } from "./transactions-list";
import { CreditDebitForm } from "./credit-debit-form";
import { TransactionsFilter, type TransactionFilters } from "./transactions-filter";
import { AuditLogsList } from "@/components/audit/audit-logs-list";

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});

  const buildTransactionsUrl = useCallback((limit: number, cursor?: string | null) => {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());

    if (filters.startDate) {
      params.set("start_date", filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params.set("end_date", filters.endDate.toISOString());
    }
    if (filters.type) {
      params.set("transaction_type", filters.type);
    }
    if (cursor) {
      params.set("next_cursor", cursor);
    }

    return `/clients/${clientId}/accounts/${accountId}/transactions?${params.toString()}`;
  }, [clientId, accountId, filters]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setShowAllTransactions(false);
      setNextCursor(null);
      setHasMore(false);
      const url = buildTransactionsUrl(5);
      const response = await apiRequest<{ data: Transaction[]; paging?: { next_cursor?: string } }>(
        url,
      );
      setTransactions(response.data || []);
      const cursor = response.paging?.next_cursor || null;
      setNextCursor(cursor);
      setHasMore(!!cursor);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [buildTransactionsUrl]);

  const fetchMoreTransactions = useCallback(async () => {
    if (!nextCursor) return;
    try {
      setLoadingMore(true);
      setShowAllTransactions(true);
      const url = buildTransactionsUrl(20, nextCursor);
      const response = await apiRequest<{ data: Transaction[]; paging?: { next_cursor?: string } }>(
        url,
      );
      setTransactions((prev) => [...prev, ...(response.data || [])]);
      const cursor = response.paging?.next_cursor || null;
      setNextCursor(cursor);
      setHasMore(!!cursor);
    } catch (error) {
      console.error("Failed to fetch more transactions:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, buildTransactionsUrl]);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  // Handle filter changes - fetch with new filters
  useEffect(() => {
    // Build URL with current filters (fetch limit+1 to detect if more results exist)
    const params = new URLSearchParams();
    params.set("limit", "6"); // Fetch one extra to detect if more results exist
    
    if (filters.startDate) {
      params.set("start_date", filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params.set("end_date", filters.endDate.toISOString());
    }
    if (filters.type) {
      params.set("transaction_type", filters.type);
    }

    const fetchFilteredTransactions = async () => {
      try {
        setLoading(true);
        setShowAllTransactions(false);
        setNextCursor(null);
        setHasMore(false);
        const url = `/clients/${clientId}/accounts/${accountId}/transactions?${params.toString()}`;
        const response = await apiRequest<{ data: Transaction[]; paging?: { next_cursor?: string } }>(
          url,
        );
        // Slice to 5 items for display, but keep nextCursor if there are 6+ items
        const allData = response.data || [];
        const displayData = allData.slice(0, 5);
        setTransactions(displayData);
        
        // Determine if there are more results
        const hasMoreResults = allData.length > 5;
        const cursor = response.paging?.next_cursor || (hasMoreResults ? allData[4]?.id : null);
        setNextCursor(cursor);
        setHasMore(!!cursor);
      } catch (error) {
        console.error("Failed to fetch transactions with filters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredTransactions();
  }, [filters.startDate, filters.endDate, filters.type, clientId, accountId]);

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

        {/* Tabs for Transactions and Audit */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
            <TabsTrigger value="audit">Auditoría</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-3 mt-4">
            {/* Transaction Filter */}
            <TransactionsFilter onFilterChange={setFilters} />

            <h3 className="font-medium text-sm">
              {showAllTransactions ? "Todas las Transacciones" : "Transacciones Recientes"}
            </h3>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <TransactionsList 
                transactions={transactions} 
                limit={showAllTransactions ? undefined : 5}
                showViewMore={hasMore}
                onViewMore={fetchMoreTransactions}
                clientId={clientId}
                accountId={accountId}
              />
            )}
            {loadingMore && (
              <div className="flex justify-center py-2">
                <Skeleton className="h-8 w-48" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Auditoría de Cuenta</h3>
              <AuditLogsList
                endpoint={`/clients/${clientId}/accounts/${accountId}/audit-logs`}
                pageSize={10}
                emptyMessage="No hay registros de auditoría para esta cuenta."
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
