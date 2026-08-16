import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');
export const passwordSchema = z
    .string()
    .min(1, 'Password is required')
    .max(1024, 'Password cannot exceed 1024 characters');
