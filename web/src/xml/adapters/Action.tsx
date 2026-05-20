import { Button as UIButton } from '@ui/button';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { useUrl } from '@xml/core/url';
import type { Props } from '@xml/types';
import { toast } from 'sonner';
import { resolveXmlExpression, resolveXmlString, resolveXmlStringArray } from './props';

/** XML action adapter that sends a request when its child trigger is activated. */
export function Action({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const action = resolveXmlString(props, 'action', ctx, '');
    const requestUrl = useUrl(String(action ?? ''));

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        await executeAction(props, ctx, requestUrl, fetch, toast);
    }

    return (
        <UIButton type="button" onClick={handleClick}>
            {renderNode(nodes, ctx)}
        </UIButton>
    );
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

    // Resolve the compiled payload at click time so it sees the latest state.
    const jsonValue = json ? json(ctx) : undefined;

    if (!actionUrl) {
        await invalidateRuntime(invalidate);

        return;
    }

    const init: RequestInit = { method: normalizedMethod };

    if (jsonValue !== undefined) {
        init.body = JSON.stringify(jsonValue);
        init.headers = { 'content-type': 'application/json' };
    }

    const response = await fetchImpl(requestUrl, init);

    if (!response.ok) {
        toastApi.error(`Request failed with status ${response.status}`);
        return;
    }

    await invalidateRuntime(invalidate);

    toastApi.success(`Request completed with status ${response.status}`);
}
