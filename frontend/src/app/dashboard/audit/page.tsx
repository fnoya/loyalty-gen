"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { AuditLogsList } from "@/components/audit/audit-logs-list";
import { AuditFilters, type AuditFilterState } from "@/components/audit/audit-filters";

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilterState>({
    action: "",
    clientId: "",
    accountId: "",
    dateFrom: "",
    dateTo: "",
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold tracking-tight">Auditoría del Sistema</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AuditFilters value={filters} onChange={setFilters} />
          
          <AuditLogsList
            endpoint="/audit-logs"
            query={{
              action: filters.action || undefined,
              clientId: filters.clientId || undefined,
              accountId: filters.accountId || undefined,
              from_date: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
              to_date: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
            }}
            pageSize={20}
            emptyMessage="No se encontraron registros de auditoría con los filtros aplicados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
