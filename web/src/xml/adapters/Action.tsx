import { createContext, useContext } from 'react';
import { useToast } from '@astryxdesign/core/Toast';
import type { Props } from '@/xml/types';
import { fetchApiResponse } from '@/lib/api';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { isAppRelativeUrl, resolveUrl, useUrl } from '@/xml/core/url';
import { resolveXmlExpression, resolveXmlString, resolveXmlStringArray } from './props';

const ActionHandlerContext = createContext<(() => void | Promise<void>) | null>(null);
const ALLOWED_ACTION_METHODS = new Set(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);

type ActionToast = {
    success(message: string): void;
    error(message: string): void;
};

/** Returns the action handler provided by the nearest XML Action wrapper. */
export function useActionHandler() {
    return useContext(ActionHandlerContext);
}

/** XML action adapter that sends a request when its child trigger is activated. */
export function Action({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const baseUrl = useUrl('');
    const showToast = useToast();
    const toastApi: ActionToast = {
        success: (message) => showToast({ body: message }),
        error: (message) => showToast({ body: message, type: 'error' }),
    };

    /** Sends the configured request and shows a minimal toast result. */
    async function handleAction() {
        // Surface action failures through the UI.
        try {
            await executeAction(props, ctx, baseUrl, fetch, toastApi);
        } catch (error: unknown) {
            toastApi.error(error instanceof Error ? error.message : 'Action failed');
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
    toastApi: ActionToast
): Promise<void> {
    let actionUrl: string;
    let formValue: unknown;
    let invalidate: string[];
    let jsonValue: unknown;
    let method: string;

    // Resolve action inputs before building the request.
    try {
        invalidate = resolveXmlStringArray(props, 'invalidate', ctx);
        const form = resolveXmlExpression(props, 'form');
        const json = resolveXmlExpression(props, 'json');
        method = resolveXmlString(props, 'method', ctx, 'POST');
        actionUrl = String(resolveXmlString(props, 'action', ctx, '') ?? '');

        // Resolve the compiled payload at click time so it sees the latest state.
        formValue = form ? form(ctx) : undefined;
        jsonValue = json ? json(ctx) : undefined;
    } catch (error: unknown) {
        toastApi.error(error instanceof Error ? error.message : 'Action failed');
        return;
    }

    const invalidateRuntime = ctx.invalidate ?? (async () => {});
    const normalizedMethod = method.trim().toUpperCase();
    const headers = new Headers();

    // Allow invalidation-only actions.
    if (!actionUrl) {
        await invalidateRuntime(invalidate);

        return;
    }

    // Reject methods outside the supported action set.
    if (!ALLOWED_ACTION_METHODS.has(normalizedMethod)) {
        toastApi.error(`Unsupported action method ${normalizedMethod}`);
        return;
    }

    const normalizedActionUrl = actionUrl.trim();

    // Keep actions scoped to the current application.
    if (!isAppRelativeUrl(normalizedActionUrl)) {
        toastApi.error('Action URL must be app-relative');
        return;
    }

    const requestUrl = resolveUrl(baseUrl, normalizedActionUrl);
    const init: RequestInit = { method: normalizedMethod };

    // Avoid ambiguous payload configuration.
    if (formValue !== undefined && jsonValue !== undefined) {
        toastApi.error('Action cannot send both form and json payloads');
        return;
    }

    // Disallow request bodies for GET actions.
    if (normalizedMethod === 'GET' && (formValue !== undefined || jsonValue !== undefined)) {
        toastApi.error('GET actions cannot send payloads');
        return;
    }

    // Build the request body from the resolved payload.
    try {
        // Send form expressions as multipart data.
        if (formValue !== undefined) {
            init.body = createActionFormData(formValue);
        } else if (jsonValue !== undefined) {
            init.body = JSON.stringify(jsonValue);
            headers.set('content-type', 'application/json');
        }

        init.headers = headers;
    } catch (error: unknown) {
        toastApi.error(error instanceof Error ? error.message : 'Action failed');
        return;
    }

    let response: Response;

    // Send the action request through the API client.
    try {
        response = await fetchApiResponse(requestUrl, init, fetchImpl);
    } catch (error: unknown) {
        toastApi.error(error instanceof Error ? error.message : 'Request failed');
        return;
    }

    // Treat non-2xx responses as action failures.
    if (!response.ok) {
        toastApi.error(`Request failed with status ${response.status}`);
        return;
    }

    await invalidateRuntime(invalidate);

    toastApi.success(`Request completed with status ${response.status}`);
}

/** Builds multipart form data from an XML action form expression. */
function createActionFormData(value: unknown): FormData {
    // Preserve prebuilt form data payloads.
    if (typeof FormData !== 'undefined' && value instanceof FormData) return value;

    // Require object-shaped form expressions.
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('form must evaluate to an object');
    }

    const formData = new FormData();

    // Append each object entry to the multipart payload.
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        appendActionFormValue(formData, key, entry);
    }

    return formData;
}

/** Appends one XML action form value to a multipart payload. */
function appendActionFormValue(formData: FormData, key: string, value: unknown): void {
    // Ignore empty optional form values.
    if (value == null) return;

    // Expand arrays into repeated form keys.
    if (Array.isArray(value)) {
        // Append each array item under the same key.
        for (const entry of value) {
            appendActionFormValue(formData, key, entry);
        }

        return;
    }

    // Preserve browser file and binary values.
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
        formData.append(key, value);
        return;
    }

    // Encode nested objects as JSON strings.
    if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        return;
    }

    formData.append(key, String(value));
}
