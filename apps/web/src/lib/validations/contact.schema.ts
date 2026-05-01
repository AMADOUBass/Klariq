import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH'], {
    required_error: 'Veuillez sélectionner un type de contact',
  }),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
