"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { AuditLog } from "@/types/audit";
import { apiRequest } from "@/lib/api";
import { AuditLogItem } from "./audit-log-item";
import { AuditLogDialog } from "./audit-log-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AuditLogsListProps {
  endpoint: string;
  query?: Record<string, string | number | null | undefined>;
  pageSize?: number;
  emptyMessage?: string;
}

export function AuditLogsList({ endpoint, query = {}, pageSize = 20, emptyMessage = "No se encontraron registros de auditoría." }: AuditLogsListProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  const buildUrl = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set("limit", pageSize.toString());
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      if (cursor) params.set("next_cursor", cursor);
      const hasQuery = endpoint.includes("?");
      return `${endpoint}${hasQuery ? "&" : "?"}${params.toString()}`;
    },
    [endpoint, pageSize, query],
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    // Reset state so first filter selection doesn't rely on previous data/cursor
    setLogs([]);
    setNextCursor(null);
    try {
      const url = buildUrl();
      // Lightweight diagnostics to confirm server-side filtering and params
      if (process.env.NODE_ENV !== "production") {
        // Avoid logging tokens or sensitive headers; only URL
        console.debug("[AuditLogsList] fetch:", url);
      }
      const response = await apiRequest<{ data: AuditLog[]; paging?: { next_cursor?: string } }>(url);
      const data = response.data || [];
      const sorted = [...data].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setLogs(sorted);
      setNextCursor(response.paging?.next_cursor || null);
    } catch (error) {
      console.error("Failed to load audit logs", error);
      setLogs([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const fetchMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const url = buildUrl(nextCursor);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[AuditLogsList] fetchMore:", url);
      }
      const response = await apiRequest<{ data: AuditLog[]; paging?: { next_cursor?: string } }>(url);
      const data = response.data || [];
      setLogs((prev) => {
        const merged = [...prev, ...data].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        return merged;
      });
      setNextCursor(response.paging?.next_cursor || null);
    } catch (error) {
      console.error("Failed to load more audit logs", error);
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, nextCursor]);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyMessage}</p>
      ) : (
        logs.map((log) => (
          <AuditLogItem key={`${log.id}-${log.timestamp}`} log={log} onClick={() => setSelectedLog(log)} />
        ))
      )}

      {nextCursor && (
        <Button
          variant="outline"
          className="w-full"
          onClick={fetchMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
            </>
          ) : (
            "Cargar más"
          )}
        </Button>
      )}

      <AuditLogDialog
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        title="Detalle de Auditoría"
        description={selectedLog ? `ID: ${selectedLog.id}` : undefined}
      />
    </div>
  );
}
