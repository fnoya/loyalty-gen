'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { AuditLog } from '@/types/audit';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClientAuditHistoryProps {
  clientId: string;
}

export function ClientAuditHistory({ clientId }: ClientAuditHistoryProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Use the correct endpoint and handle the response structure
        const response = await apiRequest<{ data: AuditLog[] }>(`/audit-logs?client_id=${clientId}`);
        setLogs(response.data || []);
      } catch (err) {
        console.error('Failed to fetch client audit logs:', err);
        setError('Failed to load audit history.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
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
        <CardContent>
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
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No history found for this client.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.actor.email || 'System'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                        {log.metadata.description || '-'}
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
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Timestamp</h4>
                  <p>{format(new Date(selectedLog.timestamp), 'PPpp')}</p>
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Action</h4>
                  <Badge>{selectedLog.action}</Badge>
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Actor</h4>
                  <p>{selectedLog.actor.email || 'Unknown'} <span className="text-xs text-muted-foreground">({selectedLog.actor.uid})</span></p>
                </div>
              </div>

              {selectedLog.changes && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Changes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-semibold mb-1">Before</h5>
                      <div className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                        <pre>{JSON.stringify(selectedLog.changes.before, null, 2)}</pre>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold mb-1">After</h5>
                      <div className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                        <pre>{JSON.stringify(selectedLog.changes.after, null, 2)}</pre>
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
