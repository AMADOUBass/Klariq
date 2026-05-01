import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface BankStatement {
  id: string;
  filename: string;
  importDate: string;
  accountId: string;
  _count: {
    transactions: number;
  };
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  reference: string | null;
  isMatched: boolean;
  matchedEntityId: string | null;
  matchedEntityType: 'INVOICE' | 'BILL' | 'MANUAL' | null;
  statement: {
    filename: string;
  };
}

export function useBankStatements() {
  return useQuery({
    queryKey: ['bank-statements'],
    queryFn: () => apiFetch<BankStatement[]>('/bank/statements'),
  });
}

export function useBankTransactions(statementId?: string) {
  return useQuery({
    queryKey: ['bank-transactions', statementId],
    queryFn: () => {
      const url = statementId 
        ? `/bank/transactions?statementId=${statementId}` 
        : '/bank/transactions';
      return apiFetch<BankTransaction[]>(url);
    },
  });
}

export function useImportStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, file }: { accountId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiFetch<{ statementId: string; imported: number; matched: number }>(
        `/bank/import/${accountId}`,
        {
          method: 'POST',
          body: formData,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    },
  });
}
