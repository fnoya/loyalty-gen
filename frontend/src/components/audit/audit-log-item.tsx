import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AuditLog } from "@/types/audit";
import { formatAuditAction } from "./audit-helpers";

interface AuditLogItemProps {
  log: AuditLog;
  onClick?: () => void;
}

export function AuditLogItem({ log, onClick }: AuditLogItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Badge variant="outline">{formatAuditAction(log.action)}</Badge>
            <span className="text-xs text-slate-500">
              {format(new Date(log.timestamp), "PPPp", { locale: es })}
            </span>
          </div>
          <div className="text-sm text-slate-700 capitalize">
            {log.resource_type} · {log.resource_id}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail className="h-3 w-3" /> {log.actor.email || "Desconocido"}
          </div>
          <div className="text-xs text-slate-500 line-clamp-2">
            {log.metadata?.description || "Sin descripción"}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400" />
      </div>
    </button>
  );
}
