export type AuditAction =
  | "CLIENT_CREATED"
  | "CLIENT_UPDATED"
  | "CLIENT_DELETED"
  | "ACCOUNT_CREATED"
  | "POINTS_CREDITED"
  | "POINTS_DEBITED"
  | "GROUP_CREATED"
  | "CLIENT_ADDED_TO_GROUP"
  | "CLIENT_REMOVED_FROM_GROUP"
  | "FAMILY_CIRCLE_MEMBER_ADDED"
  | "FAMILY_CIRCLE_MEMBER_REMOVED"
  | "LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED"
  | "POINTS_CREDITED_BY_CIRCLE_MEMBER"
  | "POINTS_DEBITED_BY_CIRCLE_MEMBER";

export type AuditResourceType = "client" | "account" | "transaction" | "group";

export interface AuditActor {
  uid: string;
  email: string | null;
}

export interface AuditChanges {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface AuditMetadata {
  ip_address?: string | null;
  user_agent?: string | null;
  description?: string | null;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string;
  client_id?: string | null;
  account_id?: string | null;
  group_id?: string | null;
  transaction_id?: string | null;
  actor: AuditActor;
  changes: AuditChanges | null;
  metadata: AuditMetadata;
  timestamp: string | Date; // API returns string, but we might convert to Date
}

export interface AuditLogQuery {
  action?: AuditAction;
  resource_type?: AuditResourceType;
  client_id?: string;
  account_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  next_cursor?: string;
}
