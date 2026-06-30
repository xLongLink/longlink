import { fetchApiResponse } from '@/lib/api';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { useUrl } from '@xml/core/url';
import type { Props } from '@xml/types';
import { createContext, useContext } from 'react';
import { toast } from 'sonner';
import { resolveXmlExpression, resolveXmlString, resolveXmlStringArray } from './props';

const ActionHandlerContext = createContext<(() => void | Promise<void>) | null>(null);
const ALLOWED_ACTION_METHODS = new Set(['DELETE', 'GET', 'PATCH', 'POST']);

/** Returns the action handler provided by the nearest XML Action wrapper. */
export function useActionHandler() {
    return useContext(ActionHandlerContext);
}

/** XML action adapter that sends a request when its child trigger is activated. */
export function Action({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const action = resolveXmlString(props, 'action', ctx, '');
    const requestUrl = useUrl(String(action ?? ''));

    /** Sends the configured request and shows a minimal toast result. */
    async function handleAction() {
        await executeAction(props, ctx, requestUrl, fetch, toast);
    }

    return <ActionHandlerContext.Provider value={handleAction}>{renderNode(nodes, ctx)}</ActionHandlerContext.Provider>;
}

/** Executes the action request and invalidation flow. */
export async function executeAction(
    props: Props['props'],
    ctx: ReturnType<typeof useXmlContext>['ctx'],
    requestUrl: string,
    fetchImpl: typeof fetch = fetch,
    toastApi: { success(message: string): void; error(message: string): void } = toast
): Promise<void> {
    const invalidate = resolveXmlStringArray(props, 'invalidate', ctx);
    const json = resolveXmlExpression(props, 'json');
    const method = resolveXmlString(props, 'method', ctx, 'POST');
    const invalidateRuntime = ctx.invalidate ?? (async () => {});
    const normalizedMethod = method.trim().toUpperCase();
    const actionUrl = String(resolveXmlString(props, 'action', ctx, '') ?? '');
    const headers = new Headers();

    // Resolve the compiled payload at click time so it sees the latest state.
    const jsonValue = json ? json(ctx) : undefined;

    if (!actionUrl) {
        await invalidateRuntime(invalidate);

        return;
    }

    if (!ALLOWED_ACTION_METHODS.has(normalizedMethod)) {
        toastApi.error(`Unsupported action method ${normalizedMethod}`);
        return;
    }

    const init: RequestInit = { method: normalizedMethod };

    if (jsonValue !== undefined) {
        init.body = JSON.stringify(jsonValue);
        headers.set('content-type', 'application/json');
    }

    init.headers = headers;

    const response = await fetchApiResponse(requestUrl, init, fetchImpl);

    if (!response.ok) {
        toastApi.error(`Request failed with status ${response.status}`);
        return;
    }

    await invalidateRuntime(invalidate);

    toastApi.success(`Request completed with status ${response.status}`);
}
