"use client";

import { ArrowDown, ArrowUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Transaction } from "@/types/transaction";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionsListProps {
  transactions: Transaction[];
  loading?: boolean;
  limit?: number;
  showViewMore?: boolean;
  onViewMore?: () => void;
}

export function TransactionsList({
  transactions,
  loading = false,
  limit,
  showViewMore = false,
  onViewMore,
}: TransactionsListProps) {
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

  // Check if there are more transactions beyond the display limit
  const hasMoreTransactions = limit && transactions.length > limit;

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
            <div className="text-right">
              <p className={`text-lg font-bold ${amountColor}`}>
                {sign}
                {transaction.amount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">puntos</p>
            </div>
          </div>
        );
      })}

      {showViewMore && onViewMore && (
        <button
          onClick={onViewMore}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
        >
          Ver más transacciones
        </button>
      )}
    </div>
  );
}
