export interface TransactionOriginator {
  clientId: string;
  isCircleMember: boolean;
  relationshipType?: string | null;
}

export interface Transaction {
  id: string;
  transaction_type: "credit" | "debit";
  amount: number;
  description: string;
  originatedBy: TransactionOriginator | null;
  timestamp: string;

  // UI helper fields (may be enriched or computed)
  client_id?: string;
  account_id?: string;
  status?: string;
  reference_id?: string;
  created_at?: string;

  // Legacy/Compatibility fields (to match what I wrote in the page component)
  type?: string; // mapped from transaction_type
}
