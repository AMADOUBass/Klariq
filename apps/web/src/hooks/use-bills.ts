import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface BillLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Bill {
  id: string;
  number: string;
  contactId: string;
  contact: { name: string };
  date: string;
  dueDate: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'VOID';
  totalAmount: number;
  totalTax: number;
  lines: BillLineItem[];
}

export interface CreateBillDto {
  contactId: string;
  number: string;
  date: string;
  dueDate: string;
  currency: string;
  notes?: string | undefined;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRateId?: string | undefined;
  }[];
}

export function useBills() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: () => apiFetch<Bill[]>('/invoicing/bills'),
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBillDto) =>
      apiFetch<Bill>('/invoicing/bills', {
        method: 'POST',
        body: JSON.stringify(dto),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useApproveBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Bill>(`/invoicing/bills/${id}/approve`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function usePayBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      apiFetch<Bill>(`/invoicing/bills/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ accountId }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}
export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateBillDto }) =>
      apiFetch<Bill>(`/invoicing/bills/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/invoicing/bills/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}
