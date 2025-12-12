import { AuditAction } from "@/types/audit";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CLIENT_CREATED: "Cliente creado",
  CLIENT_UPDATED: "Cliente actualizado",
  CLIENT_DELETED: "Cliente eliminado",
  ACCOUNT_CREATED: "Cuenta creada",
  POINTS_CREDITED: "Puntos acreditados",
  POINTS_DEBITED: "Puntos debitados",
  GROUP_CREATED: "Grupo creado",
  CLIENT_ADDED_TO_GROUP: "Cliente añadido a grupo",
  CLIENT_REMOVED_FROM_GROUP: "Cliente removido de grupo",
  FAMILY_CIRCLE_MEMBER_ADDED: "Miembro de círculo añadido",
  FAMILY_CIRCLE_MEMBER_REMOVED: "Miembro de círculo removido",
  LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED: "Permisos de círculo actualizados",
  POINTS_CREDITED_BY_CIRCLE_MEMBER: "Crédito por miembro del círculo",
  POINTS_DEBITED_BY_CIRCLE_MEMBER: "Débito por miembro del círculo",
};

export function formatAuditAction(action: AuditAction): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
