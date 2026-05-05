import { Button as UIButton } from '@/ui/button';
import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, useContext } from '@/xml';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type ButtonProps = {
    href?: string;
    target?: string;
    rel?: string;
    action?: string;
    method?: string;
    payload?: unknown;
    invalidate?: string | string[];
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
    size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
    children?: RenderableASTNode;
};

/** Normalizes invalidate targets into a list of query keys. */
function normalizeInvalidate(value: ButtonProps['invalidate']): string[] {
    if (Array.isArray(value)) return value;
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
export function Button({ props, children }: ButtonProps & { props: Record<string, string> }) {
    const queryClient = useQueryClient();
    const context = useContext();
    const href = evaluate(props.href ?? '', context, 'string');
    const target = evaluate(props.target ?? '', context, 'string');
    const rel = evaluate(props.rel ?? '', context, 'string');
    const action = evaluate(props.action ?? '', context, 'string');
    const disabled = evaluate(props.disabled ?? 'false', context, 'boolean');
    const variant = evaluate(props.variant ?? '', context, 'string') as ButtonProps['variant'];
    const size = evaluate(props.size ?? '', context, 'string') as ButtonProps['size'];
    const method = evaluate(props.method ?? 'POST', context, 'string');
    const payload = props.payload;
    const invalidate = props.invalidate;
    const handleClick = async () => {
        if (!action) return;
        const baseUrl = context.ctx.baseUrl ?? '';
        const resolvedRequestPath = action;
        const requestUrl = resolvedRequestPath.startsWith('http')
            ? resolvedRequestPath
            : `${baseUrl}${resolvedRequestPath}`;
        const requestBody = typeof payload === 'string' ? evaluate(payload, context.ctx) : payload;
        const response = await fetch(requestUrl, buildRequestInit(method.toUpperCase(), requestBody));
        const responseMessage = await readResponseMessage(response);

        if (!response.ok) {
            toast.error(responseMessage || `Request failed with status ${response.status}`);
            return;
        }

        toast.success(responseMessage);

        for (const queryKey of normalizeInvalidate(invalidate)) {
            await queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
    };

    const content = renderNode(children, context.ctx);

    if (href) {
        return (
            <a href={href} target={target} rel={rel} className="inline-flex">
                {content}
            </a>
        );
    }

    return (
        <UIButton variant={variant} size={size} onClick={() => void handleClick()} disabled={disabled}>
            {content}
        </UIButton>
    );
}
