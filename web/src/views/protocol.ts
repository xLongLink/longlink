import { z } from 'zod';

export const MAX_SOURCE_SIZE = 1_000_000;

export const MAX_MESSAGE_SIZE = 2_000_000;

export const MAX_PENDING_REQUESTS = 8;

// Allow the Platform's 120-second Solution proxy timeout to finish, including cold starts.
export const REQUEST_TIMEOUT = 130_000;

export const parametersSchema = z.record(z.string(), z.string());

export const requestSchema = z
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
    .strict()
    .superRefine((command, context) => {
        // Apply body admission rules at both ends of the request bridge.
        if (command.json !== undefined && command.form !== undefined) {
            context.addIssue({ code: 'custom', path: ['form'], message: 'Choose JSON or form data' });
        }

        if (command.method === 'GET' && (command.json !== undefined || command.form !== undefined)) {
            context.addIssue({ code: 'custom', path: ['method'], message: 'GET requests cannot send a body' });
        }
    });

export const downloadSchema = z
    .object({
        type: z.literal('download'),
        id: z.number().int().nonnegative(),
        path: z.string().min(1).max(4096),
        filename: z
            .string()
            .min(1)
            .max(256)
            .regex(/^[^/\\\p{Cc}]+$/u),
    })
    .strict();

export const commandSchema = z.discriminatedUnion('type', [
    requestSchema,
    z.object({ type: z.literal('navigate'), path: z.string().min(1).max(4096) }).strict(),
    downloadSchema,
]);

export type RequestCommand = z.output<typeof requestSchema>;

export type DownloadCommand = z.output<typeof downloadSchema>;

// Replies contain only backend JSON or bounded binary responses, never arbitrary runtime objects.
export const responseSchema = z.union([z.json(), z.instanceof(Blob)]);

export type ViewData = z.output<typeof responseSchema>;

export type ViewReply =
    | { id: number; ok: true; data: ViewData }
    | { id: number; ok: false; error: string; status?: number };

/** Bounds bridge payloads before allowing them to consume host resources. */
export function messageSize(command: RequestCommand): number {
    // Count UTF-8 bytes consistently with the SDK source and host response limits.
    const encoder = new TextEncoder();

    return (
        encoder.encode(JSON.stringify(command.json ?? null)).byteLength +
        (command.form ?? []).reduce(
            (size, [name, value]) =>
                size +
                encoder.encode(name).byteLength +
                (value instanceof Blob ? value.size : encoder.encode(value).byteLength),
            0
        )
    );
}
