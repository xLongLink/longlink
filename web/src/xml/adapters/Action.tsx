import { fetchApiResponse } from '@/lib/api';
import { useXmlContext } from '@/xml/core/context';
import { renderNode } from '@/xml/core/node';
import { resolveRequestUrl, useUrl } from '@/xml/core/url';
import type { Props } from '@/xml/types';
import { createContext, useContext } from 'react';
import { toast } from 'sonner';
import { resolveXmlExpression, resolveXmlString, resolveXmlStringArray } from './props';

const ActionHandlerContext = createContext<(() => void | Promise<void>) | null>(null);
const ALLOWED_ACTION_METHODS = new Set(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);

/** Returns the action handler provided by the nearest XML Action wrapper. */
export function useActionHandler() {
    return useContext(ActionHandlerContext);
}

/** XML action adapter that sends a request when its child trigger is activated. */
export function Action({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const baseUrl = useUrl('');

    /** Sends the configured request and shows a minimal toast result. */
    async function handleAction() {
        try {
            await executeAction(props, ctx, baseUrl, fetch, toast);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Action failed');
        }
    }

    return <ActionHandlerContext.Provider value={handleAction}>{renderNode(nodes, ctx)}</ActionHandlerContext.Provider>;
}

/** Executes the action request and invalidation flow. */
export async function executeAction(
    props: Props['props'],
    ctx: ReturnType<typeof useXmlContext>['ctx'],
    baseUrl: string,
    fetchImpl: typeof fetch = fetch,
    toastApi: { success(message: string): void; error(message: string): void } = toast
): Promise<void> {
    // Keep XML authoring/runtime failures as user-visible action errors.
    try {
        const invalidate = resolveXmlStringArray(props, 'invalidate', ctx);
        const form = resolveXmlExpression(props, 'form');
        const json = resolveXmlExpression(props, 'json');
        const method = resolveXmlString(props, 'method', ctx, 'POST');
        const invalidateRuntime = ctx.invalidate ?? (async () => {});
        const normalizedMethod = method.trim().toUpperCase();
        const actionUrl = String(resolveXmlString(props, 'action', ctx, '') ?? '');
        const headers = new Headers();

        // Resolve the compiled payload at click time so it sees the latest state.
        const formValue = form ? form(ctx) : undefined;
        const jsonValue = json ? json(ctx) : undefined;

        if (!actionUrl) {
            await invalidateRuntime(invalidate);

            return;
        }

        if (!ALLOWED_ACTION_METHODS.has(normalizedMethod)) {
            toastApi.error(`Unsupported action method ${normalizedMethod}`);
            return;
        }

        let requestUrl: string;

        try {
            requestUrl = resolveRequestUrl(baseUrl, actionUrl);
        } catch {
            toastApi.error('Action URL must be app-relative');
            return;
        }

        const init: RequestInit = { method: normalizedMethod };

        if (formValue !== undefined && jsonValue !== undefined) {
            toastApi.error('Action cannot send both form and json payloads');
            return;
        }

        if (normalizedMethod === 'GET' && (formValue !== undefined || jsonValue !== undefined)) {
            toastApi.error('GET actions cannot send payloads');
            return;
        }

        if (formValue !== undefined) {
            init.body = createActionFormData(formValue);
        } else if (jsonValue !== undefined) {
            init.body = JSON.stringify(jsonValue);
            headers.set('content-type', 'application/json');
        }

        init.headers = headers;

        let response: Response;

        try {
            response = await fetchApiResponse(requestUrl, init, fetchImpl);
        } catch (error: unknown) {
            toastApi.error(error instanceof Error ? error.message : 'Request failed');
            return;
        }

        if (!response.ok) {
            toastApi.error(`Request failed with status ${response.status}`);
            return;
        }

        await invalidateRuntime(invalidate);

        toastApi.success(`Request completed with status ${response.status}`);
    } catch (error: unknown) {
        toastApi.error(error instanceof Error ? error.message : 'Action failed');
    }
}

/** Builds multipart form data from an XML action form expression. */
function createActionFormData(value: unknown): FormData {
    if (typeof FormData !== 'undefined' && value instanceof FormData) return value;

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('form must evaluate to an object');
    }

    const formData = new FormData();

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        appendActionFormValue(formData, key, entry);
    }

    return formData;
}

/** Appends one XML action form value to a multipart payload. */
function appendActionFormValue(formData: FormData, key: string, value: unknown): void {
    if (value == null) return;

    if (Array.isArray(value)) {
        for (const entry of value) {
            appendActionFormValue(formData, key, entry);
        }

        return;
    }

    if (typeof Blob !== 'undefined' && value instanceof Blob) {
        formData.append(key, value);
        return;
    }

    if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        return;
    }

    formData.append(key, String(value));
}
