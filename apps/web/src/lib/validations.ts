import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const onboardingSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  legalName: z.string().min(2, 'Legal name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().length(2),
  postalCode: z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/, 'Invalid postal code (A1B 2C3)'),
  gstNumber: z.string().regex(/^\d{9} RT \d{4}$/, 'Invalid GST number (123456789 RT 0001)'),
  qstNumber: z.string().regex(/^\d{10} TQ \d{4}$/, 'Invalid QST number (1023456789 TQ 0001)'),
  taxFrequency: z.enum(['monthly', 'quarterly', 'annually']),
  fiscalYearStart: z.string(),
  currency: z.string().length(3),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
