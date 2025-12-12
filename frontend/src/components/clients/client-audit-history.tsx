"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AuditLog } from "@/types/audit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClientAuditHistoryProps {
  clientId: string;
  // Optional filters to refine results; keys should use snake_case
  query?: Record<string, string | number | undefined>;
}

export function ClientAuditHistory({ clientId, query = {} }: ClientAuditHistoryProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const normalizeAction = (val: string) => {
    // Convert common labels like "client created" to enum "CLIENT_CREATED"
    return val.trim().replace(/\s+/g, "_").toUpperCase();
  };

  const buildQueryString = (extra: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    // Always include client_id
    params.set("client_id", clientId);
    // Merge optional filters
    Object.entries({ ...query, ...extra }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (key === "action" && typeof value === "string") {
          params.set(key, normalizeAction(value));
        } else {
          params.set(key, String(value));
        }
      }
    });
    return params.toString();
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const qs = buildQueryString({ limit: 10 });
        const response = await apiRequest<{ data: AuditLog[]; paging?: { next_cursor?: string } }>(
          `/audit-logs?${qs}`,
        );
        setLogs(response.data || []);
        const cursor = response.paging?.next_cursor || null;
        setNextCursor(cursor);
        setHasMore(!!cursor);
      } catch (err) {
        console.error("Failed to fetch client audit logs:", err);
        setError("Failed to load audit history.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [clientId, query]);

  const fetchMoreLogs = async () => {
    if (!nextCursor) return;
    try {
      setLoadingMore(true);
      const qs = buildQueryString({ limit: 20, next_cursor: nextCursor });
      const response = await apiRequest<{ data: AuditLog[]; paging?: { next_cursor?: string } }>(
        `/audit-logs?${qs}`,
      );
      setLogs((prev) => [...prev, ...(response.data || [])]);
      const cursor = response.paging?.next_cursor || null;
      setNextCursor(cursor);
      setHasMore(!!cursor);
    } catch (err) {
      console.error("Failed to fetch more audit logs:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading history...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500 bg-red-50 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No history found for this client.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.timestamp), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {log.actor.email || "System"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                        {log.metadata.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={fetchMoreLogs}
                disabled={loadingMore}
                variant="outline"
                className="w-full"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  "Cargar más registros"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>ID: {selectedLog?.id}</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">
                    Timestamp
                  </h4>
                  <p>{format(new Date(selectedLog.timestamp), "PPpp")}</p>
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">
                    Action
                  </h4>
                  <Badge>{selectedLog.action}</Badge>
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">
                    Actor
                  </h4>
                  <p>
                    {selectedLog.actor.email || "Unknown"}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({selectedLog.actor.uid})
                    </span>
                  </p>
                </div>
              </div>

              {selectedLog.changes && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">
                    Changes
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-semibold mb-1">Before</h5>
                      <div className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                        <pre>
                          {JSON.stringify(selectedLog.changes.before, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold mb-1">After</h5>
                      <div className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                        <pre>
                          {JSON.stringify(selectedLog.changes.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
