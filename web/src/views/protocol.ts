import { z } from 'zod';

export const MAX_SOURCE_SIZE = 1_000_000;
export const MAX_MESSAGE_SIZE = 2_000_000;
export const MAX_PENDING_REQUESTS = 8;
// Allow the Platform's 120-second Solution proxy timeout to finish, including cold starts.
export const REQUEST_TIMEOUT = 130_000;
export const parametersSchema = z.record(z.string(), z.string());

export const commandSchema = z.discriminatedUnion('type', [
    z
        .object({
            type: z.literal('request'),
            id: z.number().int().nonnegative(),
            path: z.string().min(1).max(4096),
            method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
            json: z.json().optional(),
            form: z
                .array(z.tuple([z.string().max(256), z.union([z.string(), z.instanceof(Blob)])]))
                .max(32)
                .optional(),
            binary: z.boolean().optional(),
        })
        .strict(),
    z.object({ type: z.literal('navigate'), path: z.string().min(1).max(4096) }).strict(),
    z.object({ type: z.literal('resize'), height: z.number().int().min(1).max(100_000) }).strict(),
]);

export type ViewCommand = z.output<typeof commandSchema>;
export type RequestCommand = Extract<ViewCommand, { type: 'request' }>;
export type ViewReply = { id: number; ok: true; data: unknown } | { id: number; ok: false; error: string };

/** Bounds bridge payloads before allowing them to consume host resources. */
export function messageSize(command: RequestCommand): number {
    return (
        JSON.stringify(command.json ?? null).length +
        (command.form ?? []).reduce(
            (size, [name, value]) => size + name.length + (typeof value === 'string' ? value.length : value.size),
            0
        )
    );
}
