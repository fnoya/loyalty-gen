export interface LoyaltyAccount {
  id: string;
  account_name: string;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface AffinityGroup {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface AccountBalance {
  [accountId: string]: number;
}

export interface AllBalancesResponse {
  balances: AccountBalance;
}

export interface BalanceResponse {
  account_id: string;
  points: number;
}
