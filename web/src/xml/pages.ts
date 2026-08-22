import { z } from 'zod';

export const pageSchema = z.object({
    tab: z.string().trim().min(1),
    path: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    route: z.string().trim(),
});
