"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "./client-search";

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: "credit" | "debit" | null;
}

interface TransactionsFilterProps {
  onFilterChange: (filters: TransactionFilters) => void;
}

export function TransactionsFilter({ onFilterChange }: TransactionsFilterProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit" | "all">("all");

  // Debounce date changes
  const debouncedStartDate = useDebouncedValue(startDate, 500);
  const debouncedEndDate = useDebouncedValue(endDate, 500);

  useEffect(() => {
    const filters: TransactionFilters = {};

    if (debouncedStartDate) {
      filters.startDate = debouncedStartDate;
    }

    if (debouncedEndDate) {
      filters.endDate = debouncedEndDate;
    }

    if (transactionType !== "all") {
      filters.transactionType = transactionType as "credit" | "debit";
    }

    onFilterChange(filters);
  }, [debouncedStartDate, debouncedEndDate, transactionType, onFilterChange]);

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setTransactionType("all");
  };

  const hasActiveFilters = startDate || endDate || transactionType !== "all";

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Filtrar Transacciones</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="start-date">Fecha Inicio</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">Fecha Fin</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-type">Tipo de Transacción</Label>
          <Select value={transactionType} onValueChange={(value) => setTransactionType(value as any)}>
            <SelectTrigger id="transaction-type">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="debit">Débito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
