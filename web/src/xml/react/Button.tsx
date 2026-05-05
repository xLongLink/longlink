import { Button as UIButton, buttonVariants } from '@/ui/button';
import { renderNode, resolveValue, useRuntime } from '@/xml';
import { useQueryClient } from '@tanstack/react-query';
import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import type { ActionProps } from '../types';

type XMLButtonProps = Omit<Parameters<typeof UIButton>[0], keyof ActionProps> &
    ActionProps & {
        href?: string;
    };

/** Normalizes invalidate targets into a list of query keys. */
function normalizeInvalidate(value: ActionProps['invalidate']): string[] {
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
export function Button({
    action,
    href,
    onClick,
    disabled,
    variant,
    size,
    method = 'POST',
    body,
    payload,
    invalidate,
    children,
    ...props
}: XMLButtonProps) {
    const queryClient = useQueryClient();
    const { registry, ctx } = useRuntime();
    const handleClick = async (event: Parameters<NonNullable<typeof onClick>>[0]) => {
        onClick?.(event);

        if (event.defaultPrevented || !action) return;

        event.preventDefault();

        const baseUrl = ctx.baseUrl ?? '';
        const resolvedRequestPath = String(resolveValue(action, ctx));
        const requestUrl = resolvedRequestPath.startsWith('http')
            ? resolvedRequestPath
            : `${baseUrl}${resolvedRequestPath}`;
        const requestBody = resolveValue((body ?? payload) as any, ctx);
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

    if (href) {
        if (href.startsWith('/')) {
            return (
                <Link
                    {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
                    to={href}
                    className={buttonVariants({ variant, size })}
                    aria-disabled={Boolean(disabled)}
                >
                    {renderNode(children as any, registry, ctx)}
                </Link>
            );
        }
        return (
            <a
                {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
                href={href}
                className={buttonVariants({ variant, size })}
                aria-disabled={Boolean(disabled)}
            >
                {renderNode(children as any, registry, ctx)}
            </a>
        );
    }

    return (
        <UIButton {...props} variant={variant} size={size} onClick={handleClick} disabled={Boolean(disabled)}>
            {renderNode(children as any, registry, ctx)}
        </UIButton>
    );
}

export default Button;
