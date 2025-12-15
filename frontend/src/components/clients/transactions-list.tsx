"use client";

import { ArrowDown, ArrowUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

import { Transaction } from "@/types/transaction";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogDialog } from "@/components/audit/audit-log-dialog";
import { apiRequest } from "@/lib/api";
import { AuditLog } from "@/types/audit";
import { toast } from "@/components/ui/toast";

interface TransactionsListProps {
  transactions: Transaction[];
  loading?: boolean;
  limit?: number;
  showViewMore?: boolean;
  onViewMore?: () => void;
  clientId?: string;
  accountId?: string;
}

export function TransactionsList({
  transactions,
  loading = false,
  limit,
  showViewMore = false,
  onViewMore,
  clientId,
  accountId,
}: TransactionsListProps) {
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(
    null,
  );
  const [loadingAudit, setLoadingAudit] = useState<string | null>(null);

  const handleViewAudit = async (transactionId: string) => {
    if (!clientId || !accountId) {
      toast.error("Información insuficiente para cargar auditoría");
      return;
    }

    setLoadingAudit(transactionId);
    try {
      const response = await apiRequest<{ data: AuditLog[] }>(
        `/clients/${clientId}/accounts/${accountId}/transactions/${transactionId}/audit-logs`,
      );
      const logs = response.data || [];
      if (logs.length > 0) {
        setSelectedAuditLog(logs[0]);
      } else {
        toast.error(
          "No se encontró registro de auditoría para esta transacción",
        );
      }
    } catch (error) {
      console.error("Failed to load transaction audit", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al cargar auditoría";

      // Handle 404 specifically
      if (
        errorMessage.includes("no encontrada") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("404")
      ) {
        toast.error("Auditoría de transacciones aún no disponible");
      } else {
        toast.error("Error al cargar auditoría");
      }
    } finally {
      setLoadingAudit(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-600">
          No hay transacciones
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Las transacciones aparecerán aquí cuando se realicen.
        </p>
      </div>
    );
  }

  const displayTransactions = limit
    ? transactions.slice(0, limit)
    : transactions;

  // Additional count is only meaningful when a limit is provided
  const additionalCount = limit ? Math.max(0, transactions.length - limit) : 0;

  return (
    <div className="space-y-2">
      {displayTransactions.map((transaction) => {
        const isCredit = transaction.transaction_type === "credit";
        const Icon = isCredit ? ArrowUp : ArrowDown;
        const iconColor = isCredit ? "text-green-600" : "text-red-600";
        const bgColor = isCredit ? "bg-green-50" : "bg-red-50";
        const amountColor = isCredit ? "text-green-600" : "text-red-600";
        const sign = isCredit ? "+" : "-";

        return (
          <div
            key={transaction.id}
            className={`flex items-start justify-between p-3 rounded-lg border border-slate-200 ${bgColor}`}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-full ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm capitalize">
                    {isCredit ? "Crédito" : "Débito"}
                  </p>
                </div>
                {transaction.description && (
                  <p className="text-sm text-slate-600 mt-0.5">
                    {transaction.description}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(transaction.timestamp), "PPp", {
                    locale: es,
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`text-lg font-bold ${amountColor}`}>
                  {sign}
                  {transaction.amount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">puntos</p>
              </div>
            </div>
          </div>
        );
      })}

      {showViewMore && onViewMore && (
        <button
          onClick={onViewMore}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
        >
          {additionalCount > 0
            ? `Ver más transacciones (${additionalCount} adicionales)`
            : "Ver más transacciones"}
        </button>
      )}

      <AuditLogDialog
        log={selectedAuditLog}
        open={!!selectedAuditLog}
        onOpenChange={(open) => !open && setSelectedAuditLog(null)}
        title="Auditoría de Transacción"
        description={
          selectedAuditLog ? `ID: ${selectedAuditLog.id}` : undefined
        }
      />
    </div>
  );
}
