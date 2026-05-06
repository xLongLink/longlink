import { Button as UIButton } from '@/ui/button';
import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, useContext, useUrl } from '@/xml';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type ButtonProps = {
    action?: string;
    method?: string;
    payload?: unknown;
    invalidate?: string;
};

/** Normalizes the invalidate target into a list of query keys. */
function normalizeInvalidate(value: ButtonProps['invalidate']): string[] {
    if (typeof value !== 'string') return [];

    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

/** Builds request options for XML button actions. */
function buildRequestInit(method: string, body: unknown): RequestInit {
    if (method === 'GET' || method === 'HEAD' || body === undefined) return { method };

    if (
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof Blob ||
        typeof body === 'string'
    ) {
        if (typeof body === 'string') {
            const trimmedBody = body.trim();

            if (
                (trimmedBody.startsWith('{') && trimmedBody.endsWith('}')) ||
                (trimmedBody.startsWith('[') && trimmedBody.endsWith(']'))
            ) {
                return { method, body, headers: { 'content-type': 'application/json' } };
            }
        }

        return { method, body };
    }

    return { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } };
}

/** Reads a concise response message for toast feedback. */
async function readResponseMessage(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
        const data = (await response.json()) as unknown;

        if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
            return data.message;
        }

        return JSON.stringify(data);
    }

    const message = await response.text();
    return message || 'Request completed';
}

/** XML button adapter that maps action-layer props to DOM-safe button props. */
export function Button({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();

    const action = String(evaluate(rawProps.action ?? '', ctx) ?? '');
    const method = String(evaluate(rawProps.method ?? '', ctx) ?? 'POST');
    const payload = evaluate(rawProps.payload ?? '', ctx);
    const invalidate = evaluate(rawProps.invalidate ?? '', ctx) as ButtonProps['invalidate'];
    const requestUrl = useUrl(action);
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async () => {
            if (!action) return 'Request completed';

            const response = await fetch(requestUrl, buildRequestInit(method.toUpperCase(), payload));
            const responseMessage = await readResponseMessage(response);

            if (!response.ok) {
                throw new Error(responseMessage || `Request failed with status ${response.status}`);
            }

            return responseMessage;
        },
        onSuccess: async (responseMessage) => {
            toast.success(responseMessage);

            for (const queryKey of normalizeInvalidate(invalidate)) {
                await queryClient.invalidateQueries({ queryKey: [queryKey] });
            }
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Request failed');
        },
    });

    return (
        <UIButton onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {renderXml(children)}
        </UIButton>
    );
}
