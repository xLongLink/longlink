import { z } from 'zod';
import ky, { isHTTPError } from 'ky';

const errorPayloadSchema = z.object({ detail: z.unknown().optional() });

const errorMessageSchema = z.string().refine((message) => message.trim() !== '');

const validationIssueSchema = z.object({
    msg: z.string(),
    loc: z.array(z.unknown()).catch([]),
});

const locationPartSchema = z.union([z.string(), z.number()]);

/** Error thrown for failed API responses. */
export class ApiError extends Error {
    status: number;
    url: string;

    constructor(message: string, status: number, url = '') {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.url = url;
    }
}

/** Configured HTTP client for API requests. */
export const api = ky.create({
    credentials: 'include',
    headers: { Accept: 'application/json' },
    retry: 0,
    hooks: {
        beforeError: [
            ({ request, error }) => {
                // Ky bounds error-body parsing by size and timeout before invoking this hook.
                request.signal.throwIfAborted();

                if (isHTTPError(error)) {
                    const payload = errorPayloadSchema.safeParse(error.data);
                    const detail = payload.success ? payload.data.detail : null;
                    const parsedMessage = errorMessageSchema.safeParse(detail);

                    let message = parsedMessage.success
                        ? parsedMessage.data
                        : 'The server could not complete the request. Please try again.';

                    // Report validation locations and messages, never submitted values or error context.
                    if (error.response.status === 422 && Array.isArray(detail)) {
                        const messages = detail.slice(0, 5).flatMap((value) => {
                            // Parse each issue separately so malformed entries do not hide valid feedback.
                            const issue = validationIssueSchema.safeParse(value);

                            if (!issue.success) return [];

                            const location = issue.data.loc
                                .flatMap((part) => {
                                    const parsed = locationPartSchema.safeParse(part);

                                    return parsed.success ? [parsed.data] : [];
                                })
                                .slice(1)
                                .join('.');

                            return [location ? `${location}: ${issue.data.msg}` : issue.data.msg];
                        });

                        if (messages.length > 0) message = messages.join('; ');
                    }

                    return new ApiError(message, error.response.status, request.url);
                }

                return error;
            },
        ],
    },
});
