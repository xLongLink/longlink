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
    const invalidate = resolveXmlStringArray(props, 'invalidate', ctx);
    const json = resolveXmlExpression(props, 'json');
    const method = resolveXmlString(props, 'method', ctx, 'POST');
    const actionUrl = String(action ?? '');
    const requestUrl = useUrl(actionUrl);
    const invalidateRuntime = ctx.invalidate ?? (async () => {});
    const normalizedMethod = method.trim().toUpperCase();

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        // Recreate any invalidated runtime sources after the action succeeds.
        const ids = invalidate;
        const jsonValue = json ? json(ctx) : undefined;

        if (!actionUrl) {
            await invalidateRuntime(ids);

            return;
        }

        const init: RequestInit = { method: normalizedMethod };

        if (jsonValue !== undefined) {
            // Resolve the compiled payload at click time so it sees the latest state.
            init.body = JSON.stringify(jsonValue);
            init.headers = { 'content-type': 'application/json' };
        }

        const response = await fetch(requestUrl, init);

        if (!response.ok) {
            toast.error(`Request failed with status ${response.status}`);
            return;
        }

        await invalidateRuntime(ids);

        toast.success(`Request completed with status ${response.status}`);
    }

    return (
        <UIButton type="button" onClick={handleClick}>
            {renderNode(nodes, ctx)}
        </UIButton>
    );
}
