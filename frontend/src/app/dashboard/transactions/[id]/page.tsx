'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { Transaction } from '@/types/transaction';
import { AuditLog } from '@/types/audit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Calendar, CreditCard, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionAuditHistory } from '@/components/transactions/transaction-audit-history';

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        // Fetch audit logs for this transaction ID to reconstruct details
        // Since we don't have a direct GET /transactions/:id endpoint yet
        const logs = await apiRequest<AuditLog[]>(`/audit-logs?transaction_id=${id}&limit=1`);
        
        if (!logs || logs.length === 0) {
          throw new Error('Transaction not found');
        }

        const log = logs[0];
        const isCredit = log.action === 'POINTS_CREDITED';
        // Calculate amount from changes if available
        let amount = 0;
        if (log.changes?.before && log.changes?.after) {
           const before = (log.changes.before as any).points || 0;
           const after = (log.changes.after as any).points || 0;
           amount = Math.abs(after - before);
        }

        const mappedTransaction: Transaction = {
          id: log.transaction_id || id,
          transaction_type: isCredit ? 'credit' : 'debit',
          type: isCredit ? 'EARN' : 'REDEEM', // For UI compatibility
          amount: amount,
          status: 'COMPLETED',
          description: log.metadata.description || '',
          timestamp: log.timestamp.toString(),
          created_at: log.timestamp.toString(),
          client_id: log.client_id || undefined,
          account_id: log.account_id || undefined,
          originatedBy: null,
        };

        setTransaction(mappedTransaction);
      } catch (err) {
        console.error('Failed to fetch transaction:', err);
        setError('Failed to load transaction details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTransaction();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
        <p className="text-muted-foreground mb-4">{error || 'Transaction not found'}</p>
        <Button onClick={() => router.push('/dashboard/transactions')}>
          Back to Transactions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/transactions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction Details</h1>
          <p className="text-muted-foreground text-sm">ID: {transaction.id}</p>
        </div>
        <div className="ml-auto">
          <Badge 
            variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}
            className="text-sm px-3 py-1"
          >
            {transaction.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="audit">Audit History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Transaction Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Type</p>
                    <p className="font-medium capitalize">{(transaction.type || transaction.transaction_type).replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Amount</p>
                    <p className="font-medium text-lg">
                      {transaction.transaction_type === 'debit' ? '-' : '+'}{transaction.amount} pts
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(transaction.created_at || transaction.timestamp), 'PPP p')}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Reference</p>
                    <p className="font-mono text-xs bg-muted p-1 rounded inline-block">
                      {transaction.reference_id || 'N/A'}
                    </p>
                  </div>
                </div>
                
                {transaction.description && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-sm mb-1">Description</p>
                    <p className="text-sm">{transaction.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Client & Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Client ID</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium"
                      onClick={() => router.push(`/dashboard/clients/${transaction.client_id}`)}
                    >
                      {transaction.client_id}
                    </Button>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Loyalty Account ID</p>
                    <p className="font-mono text-xs">{transaction.account_id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="audit" className="mt-4">
          <TransactionAuditHistory transactionId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
