import { z } from 'zod';

export const registerSchema = z.object({
  userName: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
});

export const loginSchema = z.object({
  userName: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(1, 'Password is required')
}).refine(data => data.userName || data.email, {
  message: 'Either username or email is required'
});

export const updateUserSchema = z.object({
  userName: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .optional()
}).refine(data => data.userName || data.email, {
  message: 'At least one field must be provided'
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
