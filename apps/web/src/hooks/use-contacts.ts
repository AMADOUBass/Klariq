import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  isActive: boolean;
  createdAt: string;
}

export interface CreateContactDto {
  name: string;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiFetch<Contact[]>('/invoicing/contacts'),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateContactDto) =>
      apiFetch<Contact>('/invoicing/contacts', {
        method: 'POST',
        body: JSON.stringify(dto),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateContactDto }) =>
      apiFetch<Contact>(`/invoicing/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/invoicing/contacts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
