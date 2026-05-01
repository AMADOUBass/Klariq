import { z } from 'zod';

export const billLineSchema = z.object({
  description: z.string().min(1, 'La description est requise'),
  quantity: z.coerce.number().positive('La quantité doit être positive'),
  unitPrice: z.coerce.number().min(0, 'Le prix doit être positif'),
  taxRateId: z.string().optional(),
});

export const billSchema = z.object({
  contactId: z.string().min(1, 'Veuillez sélectionner un fournisseur'),
  number: z.string().min(1, 'Le numéro de facture est requis'),
  date: z.string().min(1, 'La date est requise'),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  currency: z.string().default('CAD'),
  notes: z.string().optional(),
  lines: z.array(billLineSchema).min(1, 'Au moins une ligne est requise'),
});

export type BillFormValues = z.infer<typeof billSchema>;
export type BillLineFormValues = z.infer<typeof billLineSchema>;
