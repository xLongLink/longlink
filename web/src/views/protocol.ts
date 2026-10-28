import { z } from 'zod';
import { appearanceSchema } from '@/lib/appearance';

export const appearanceMessageSchema = z
    .object({ type: z.literal('appearance'), appearance: appearanceSchema })
    .strict();

export type AppearanceMessage = z.output<typeof appearanceMessageSchema>;

// Allow the Platform's 120-second Solution proxy timeout to finish, including cold starts.
export const REQUEST_TIMEOUT = 130_000;

export const MAX_MODAL_DEPTH = 8;

export const parametersSchema = z.record(z.string(), z.string());

export const requestSchema = z
    .object({
        type: z.literal('request'),
        id: z.number().int().nonnegative(),
        path: z.string().min(1),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        json: z.json().optional(),
        form: z.array(z.tuple([z.string(), z.union([z.string(), z.instanceof(Blob)])])).optional(),
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
        path: z.string().min(1),
        filename: z
            .string()
            .min(1)
            .max(256)
            .regex(/^[^/\\\p{Cc}]+$/u),
    })
    .strict();

export const iconSchema = z
    .object({
        type: z.literal('icon'),
        id: z.number().int().nonnegative(),
        name: z.string().min(1),
    })
    .strict();

// The icon bridge carries inert SVG geometry, never markup, URLs, or executable element attributes.
export const iconDataSchema = z.object({
    name: z.string().max(64).optional(),
    size: z.literal(24),
    node: z
        .array(
            z.tuple([
                z.enum(['path', 'circle', 'rect', 'line', 'ellipse', 'polyline', 'polygon']),
                z.partialRecord(
                    z.enum([
                        'd',
                        'key',
                        'cx',
                        'cy',
                        'r',
                        'x',
                        'y',
                        'width',
                        'height',
                        'rx',
                        'ry',
                        'x1',
                        'x2',
                        'y1',
                        'y2',
                        'fill',
                        'points',
                    ]),
                    z.string().max(8192)
                ),
            ])
        )
        .max(64),
});

export const commandSchema = z.discriminatedUnion('type', [
    requestSchema,
    // Only bounded dimensions cross the sandbox boundary; the host owns page scrolling.
    z.object({ type: z.literal('resize'), height: z.number().int().min(1).max(1_000_000) }).strict(),
    z.object({ type: z.literal('modal'), depth: z.number().int().min(0).max(MAX_MODAL_DEPTH) }).strict(),
    z.object({ type: z.literal('navigate'), path: z.string().min(1), newTab: z.boolean().optional() }).strict(),
    downloadSchema,
    iconSchema,
]);

export type RequestCommand = z.output<typeof requestSchema>;

export type DownloadCommand = z.output<typeof downloadSchema>;

export type IconCommand = z.output<typeof iconSchema>;

// Replies contain only backend JSON or binary responses, never arbitrary runtime objects.
export const responseSchema = z.union([z.json(), z.instanceof(Blob)]);

export type ViewData = z.output<typeof responseSchema>;

export type ViewReply =
    | { id: number; ok: true; data: ViewData }
    | { id: number; ok: false; error: string; status?: number; notified?: boolean };
