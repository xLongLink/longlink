import { z } from 'zod';
import { zOrganizationRoles } from '@/lib/generated/platform-api-v1/zod.gen';

/** Validates optional avatar URLs accepted by Platform profile editors. */
export const avatarUrlSchema = z
    .string()
    .trim()
    .pipe(
        z.union([z.literal(''), z.url({ protocol: /^https?$/ })], {
            error: 'Enter a valid HTTP(S) avatar URL.',
        })
    );

export const avatarFormSchema = z.object({ avatar: avatarUrlSchema });

export const accountNameSchema = z.object({
    name: z.string().trim().min(1, 'Username is required'),
});

export const invitationSchema = z.object({
    email: z
        .string()
        .trim()
        .pipe(z.email({ error: 'Enter a valid email address.' })),
    role: zOrganizationRoles,
});
