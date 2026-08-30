import { z } from 'zod';

/** Validates optional avatar URLs accepted by Platform profile editors. */
export const avatarUrlSchema = z.union([
    z.literal(''),
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
]);
