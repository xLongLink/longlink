import { createContext, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchApiResponse } from '@/lib/api';
import type { Props, RuntimeServices, Scope } from '../types';
import { renderNode } from '../core/node';
import { ACTION_METHODS } from '../constants';
import { DialogCloseContext } from './Dialog';
import { useXmlRuntime } from '../core/context';
import { resolveRequestUrl } from '../core/url';
import { resolveXml, resolveXmlValue } from '../core/props';

export const ActionHandlerContext = createContext<(() => void | Promise<void>) | null>(null);

/** XML action adapter that sends a request when its child trigger is activated. */
export function Action({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const closeDialog = useContext(DialogCloseContext);
    const toast = useToast();

    /** Sends the configured request and shows a minimal toast result. */
    async function handleAction() {
        // Surface action failures through the UI.
        try {
            await executeAction(props, ctx, services, fetch, toast, closeDialog);
        } catch (error: unknown) {
            toast({ body: error instanceof Error ? error.message : 'Action failed', type: 'error' });
        }
    }

    return <ActionHandlerContext.Provider value={handleAction}>{renderNode(nodes, ctx)}</ActionHandlerContext.Provider>;
}

/** Executes the action request and invalidation flow. */
export async function executeAction(
    props: Props['props'],
    ctx: Scope,
    services: RuntimeServices,
    fetchImpl: typeof fetch = fetch,
    toast: ReturnType<typeof useToast>,
    closeDialog: (() => void) | null = null
): Promise<void> {
    let actionUrl: string;
    let formValue: unknown;
    let invalidate: string[];
    let jsonValue: unknown;
    let method: string;

    // Resolve action inputs before building the request.
    try {
        const invalidationValue = resolveXmlValue(props, 'invalidate', ctx) ?? [];
        if (!Array.isArray(invalidationValue)) {
            throw new Error('invalidate must evaluate to an array');
        }

        invalidate = invalidationValue.map((value) => String(value));
        const methodValue = resolveXml(props, 'method', ctx);
        const actionValue = resolveXml(props, 'action', ctx);
        method = typeof methodValue === 'string' ? methodValue : 'POST';
        actionUrl = typeof actionValue === 'string' ? actionValue : '';
        if (!actionUrl) {
            throw new Error('Action requires an action URL');
        }

        // Resolve action payloads at click time so they see the latest state.
        formValue = resolveXmlValue(props, 'form', ctx);
        jsonValue = resolveXmlValue(props, 'json', ctx);
    } catch (error: unknown) {
        toast({ body: error instanceof Error ? error.message : 'Action failed', type: 'error' });
        return;
    }

    const normalizedMethod = method.trim().toUpperCase();

    // Reject methods outside the supported action set.
    if (!ACTION_METHODS.some((allowedMethod) => allowedMethod === normalizedMethod)) {
        toast({ body: `Unsupported action method ${normalizedMethod}`, type: 'error' });
        return;
    }

    let requestUrl: string;

    // Keep actions scoped to the current application.
    try {
        requestUrl = resolveRequestUrl(services.requestBaseUrl, actionUrl);
    } catch {
        toast({ body: 'Action URL must be app-relative', type: 'error' });
        return;
    }

    const init: RequestInit = { method: normalizedMethod };

    // Avoid ambiguous payload configuration.
    if (formValue !== undefined && jsonValue !== undefined) {
        toast({ body: 'Action cannot send both form and json payloads', type: 'error' });
        return;
    }

    // Disallow request bodies for GET actions.
    if (normalizedMethod === 'GET' && (formValue !== undefined || jsonValue !== undefined)) {
        toast({ body: 'GET actions cannot send payloads', type: 'error' });
        return;
    }

    // Build the request body from the resolved payload.
    try {
        // Send form expressions as multipart data.
        if (formValue !== undefined) {
            init.body = createActionFormData(formValue);
        } else if (jsonValue !== undefined) {
            init.body = JSON.stringify(jsonValue);
            init.headers = { 'content-type': 'application/json' };
        }
    } catch (error: unknown) {
        toast({ body: error instanceof Error ? error.message : 'Action failed', type: 'error' });
        return;
    }

    let response: Response;

    // Send the action request through the API client.
    try {
        response = await fetchApiResponse(requestUrl, init, fetchImpl);
    } catch (error: unknown) {
        toast({ body: error instanceof Error ? error.message : 'Request failed', type: 'error' });
        return;
    }

    // Treat non-2xx responses as action failures.
    if (!response.ok) {
        toast({ body: `Request failed with status ${response.status}`, type: 'error' });
        return;
    }

    await services.invalidate(invalidate);

    // Close the containing dialog only after the request and invalidation succeed.
    if (resolveXml(props, 'closeDialog', ctx)) closeDialog?.();

    toast({ body: `Request completed with status ${response.status}` });
}

/** Builds multipart form data from an XML action form expression. */
function createActionFormData(value: unknown): FormData {
    // Preserve prebuilt form data payloads.
    if (typeof FormData !== 'undefined' && value instanceof FormData) {
        return value;
    }

    // Require object-shaped form expressions.
    if (!isRecord(value)) {
        throw new Error('form must evaluate to an object');
    }

    const formData = new FormData();

    // Append each object entry to the multipart payload.
    for (const [key, entry] of Object.entries(value)) {
        appendActionFormValue(formData, key, entry);
    }

    return formData;
}

/** Returns whether a value is a non-array object with string keys. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Appends one XML action form value to a multipart payload. */
function appendActionFormValue(formData: FormData, key: string, value: unknown): void {
    // Ignore empty optional form values.
    if (value == null) {
        return;
    }

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
