import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');
export const emailPayloadSchema = z.object({ email: emailSchema });
export const passwordSchema = z
    .string()
    .min(1, 'Password is required')
    .max(1024, 'Password cannot exceed 1024 characters');

/** Converts React Form validation errors into an Astryx input status. */
export function fieldErrorStatus(errors: readonly unknown[]) {
    const error = errors[0];
    if (error == null) return undefined;

    const message =
        typeof error === 'object' && 'message' in error && typeof error.message === 'string'
            ? error.message
            : undefined;

    return { type: 'error' as const, message };
}

export type EmailPayload = z.infer<typeof emailPayloadSchema>;
