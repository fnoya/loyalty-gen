"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AuditLog } from "@/types/audit";
import { formatAuditAction } from "./audit-helpers";

interface AuditLogDialogProps {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function AuditLogDialog({ log, open, onOpenChange, title = "Detalle de Auditoría", description }: AuditLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || (log ? `ID: ${log.id}` : "Sin registro disponible")}
          </DialogDescription>
        </DialogHeader>

        {log ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {format(new Date(log.timestamp), "PPPp", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Acción</p>
                <Badge>{formatAuditAction(log.action)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recurso</p>
                <p className="font-medium capitalize">{log.resource_type}</p>
                <p className="text-xs text-muted-foreground">{log.resource_id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actor</p>
                <p className="font-medium">{log.actor.email || "Desconocido"}</p>
                <p className="text-xs text-muted-foreground">UID: {log.actor.uid}</p>
              </div>
            </div>

            {log.metadata && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Metadata</p>
                <div className="rounded-md border bg-slate-50 p-3 text-xs">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                </div>
              </div>
            )}

            {log.changes && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Cambios</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border bg-slate-50 p-3 overflow-auto max-h-60">
                    <p className="font-semibold mb-2">Antes</p>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.changes.before, null, 2)}</pre>
                  </div>
                  <div className="rounded-md border bg-slate-50 p-3 overflow-auto max-h-60">
                    <p className="font-semibold mb-2">Después</p>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.changes.after, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No se encontró registro de auditoría para esta operación.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
