"use client";

import { useEffect, useState } from "react";
import { FilterX, Calendar, User, CreditCard, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/components/clients/client-search";
import { AuditAction } from "@/types/audit";
import { AUDIT_ACTION_LABELS } from "./audit-helpers";

export interface AuditFilterState {
  action: AuditAction | "";
  client_id: string;
  account_id: string;
  from_date: string;
  to_date: string;
}

interface AuditFiltersProps {
  value: AuditFilterState;
  onChange: (value: AuditFilterState) => void;
}

export function AuditFilters({ value, onChange }: AuditFiltersProps) {
  const [internal, setInternal] = useState<AuditFilterState>(value);
  const debounced = useDebouncedValue(internal, 500);

  useEffect(() => {
    onChange(debounced);
  }, [debounced, onChange]);

  const handleClear = () => {
    const cleared: AuditFilterState = {
      action: "",
      client_id: "",
      account_id: "",
      from_date: "",
      to_date: "",
    };
    setInternal(cleared);
    onChange(cleared);
  };

  const hasActiveFilters =
    internal.action ||
    internal.client_id ||
    internal.account_id ||
    internal.from_date ||
    internal.to_date;

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-base text-slate-900">
            Filtrar Auditoría
          </h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-8"
          >
            <FilterX className="h-3.5 w-3.5 mr-1.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Action Filter */}
        <div className="space-y-2">
          <Label
            htmlFor="audit-action"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <Shield className="h-4 w-4 text-slate-500" />
            Tipo de acción
          </Label>
          <Select
            value={internal.action || "all"}
            onValueChange={(val) =>
              setInternal((prev) => ({
                ...prev,
                action: val === "all" ? "" : (val as AuditAction | ""),
              }))
            }
          >
            <SelectTrigger id="audit-action" className="h-10">
              <SelectValue placeholder="Todas las acciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client ID Filter */}
        <div className="space-y-2">
          <Label
            htmlFor="audit-client-id"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <User className="h-4 w-4 text-slate-500" />
            ID de cliente
          </Label>
          <div className="relative">
            <Input
              id="audit-client-id"
              value={internal.client_id}
              onChange={(e) =>
                setInternal((prev) => ({ ...prev, client_id: e.target.value }))
              }
              placeholder="Ej: client_abc123"
              className="h-10 pl-3"
            />
          </div>
        </div>

        {/* Account ID Filter */}
        <div className="space-y-2">
          <Label
            htmlFor="audit-account-id"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4 text-slate-500" />
            ID de cuenta
          </Label>
          <div className="relative">
            <Input
              id="audit-account-id"
              value={internal.account_id}
              onChange={(e) =>
                setInternal((prev) => ({ ...prev, account_id: e.target.value }))
              }
              placeholder="Ej: account_xyz789"
              className="h-10 pl-3"
            />
          </div>
        </div>
      </div>

      {/* Date Range Filter - Separate row */}
      <div className="pt-2">
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-slate-500" />
          Rango de fechas
        </Label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="audit-start-date"
              className="text-xs text-slate-600"
            >
              Fecha Inicio
            </Label>
            <Input
              id="audit-start-date"
              type="date"
              value={internal.from_date}
              onChange={(e) =>
                setInternal((prev) => ({ ...prev, from_date: e.target.value }))
              }
              max={internal.to_date || undefined}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audit-end-date" className="text-xs text-slate-600">
              Fecha Fin
            </Label>
            <Input
              id="audit-end-date"
              type="date"
              value={internal.to_date}
              onChange={(e) =>
                setInternal((prev) => ({ ...prev, to_date: e.target.value }))
              }
              min={internal.from_date || undefined}
              className="h-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
