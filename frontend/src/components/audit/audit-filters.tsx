"use client";

import { useEffect, useState } from "react";
import { FilterX } from "lucide-react";

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
  clientId: string;
  accountId: string;
  dateFrom: string;
  dateTo: string;
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
      clientId: "",
      accountId: "",
      dateFrom: "",
      dateTo: "",
    };
    setInternal(cleared);
    onChange(cleared);
  };

  const hasActiveFilters = internal.action || internal.clientId || internal.accountId || internal.dateFrom || internal.dateTo;

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Filtrar Auditoría</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <FilterX className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="audit-action">Tipo de acción</Label>
          <Select
            value={internal.action || "all"}
            onValueChange={(val) => setInternal((prev) => ({ ...prev, action: val === "all" ? "" : val as AuditAction | "" }))}
          >
            <SelectTrigger id="audit-action">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-client-id">ID de cliente</Label>
          <Input
            id="audit-client-id"
            value={internal.clientId}
            onChange={(e) => setInternal((prev) => ({ ...prev, clientId: e.target.value }))}
            placeholder="client_id"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-account-id">ID de cuenta</Label>
          <Input
            id="audit-account-id"
            value={internal.accountId}
            onChange={(e) => setInternal((prev) => ({ ...prev, accountId: e.target.value }))}
            placeholder="account_id"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-start-date">Fecha Inicio</Label>
          <Input
            id="audit-start-date"
            type="date"
            value={internal.dateFrom}
            onChange={(e) => setInternal((prev) => ({ ...prev, dateFrom: e.target.value }))}
            max={internal.dateTo || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-end-date">Fecha Fin</Label>
          <Input
            id="audit-end-date"
            type="date"
            value={internal.dateTo}
            onChange={(e) => setInternal((prev) => ({ ...prev, dateTo: e.target.value }))}
            min={internal.dateFrom || undefined}
          />
        </div>
      </div>
    </div>
  );
}
