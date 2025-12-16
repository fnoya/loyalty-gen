"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { AuditLogsList } from "@/components/audit/audit-logs-list";
import {
  AuditFilters,
  type AuditFilterState,
} from "@/components/audit/audit-filters";

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilterState>({
    action: "",
    client_id: "",
    account_id: "",
    from_date: "",
    to_date: "",
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold tracking-tight">
          Auditoría del Sistema
        </h1>
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
              client_id: filters.client_id || undefined,
              account_id: filters.account_id || undefined,
              from_date: filters.from_date
                ? new Date(filters.from_date).toISOString()
                : undefined,
              to_date: filters.to_date
                ? new Date(filters.to_date).toISOString()
                : undefined,
            }}
            pageSize={20}
            emptyMessage="No se encontraron registros de auditoría con los filtros aplicados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
