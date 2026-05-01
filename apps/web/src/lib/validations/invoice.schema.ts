import { z } from 'zod';

export const invoiceLineSchema = z.object({
  description: z.string().min(1, 'La description est requise'),
  quantity: z.coerce.number().positive('La quantité doit être positive'),
  unitPrice: z.coerce.number().min(0, 'Le prix doit être positif'),
  taxRateId: z.string().optional(),
});

export const invoiceSchema = z.object({
  contactId: z.string().min(1, 'Veuillez sélectionner un client'),
  number: z.string().min(1, 'Le numéro de facture est requis'),
  date: z.string().min(1, 'La date est requise'),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  currency: z.string().default('CAD'),
  notes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, 'Au moins une ligne est requise'),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>;
