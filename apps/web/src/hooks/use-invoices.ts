import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxCategory: 'GST_QST' | 'GST_ONLY' | 'EXEMPT';
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  contactId: string;
  contact: { name: string };
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'POSTED' | 'PAID' | 'VOID';
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  items: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId?: string;
  amount: number;
}

export interface CreateInvoiceDto {
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

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => apiFetch<Invoice[]>('/invoicing/invoices'),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateInvoiceDto) =>
      apiFetch<Invoice>('/invoicing/invoices', {
        method: 'POST',
        body: JSON.stringify(dto),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function usePostInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Invoice>(`/invoicing/invoices/${id}/post`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useSendInvoice() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: true }>(`/invoicing/invoices/${id}/send`, {
        method: 'POST',
      }),
  });
}
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateInvoiceDto }) =>
      apiFetch<Invoice>(`/invoicing/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/invoicing/invoices/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
