import { Button as UIButton } from '@ui/button';
import { toast } from 'sonner';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { useUrl } from '@xml/core/url';
import type { Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlExpression, resolveXmlString, resolveXmlStringArray } from './props';

/** XML button adapter that maps action-layer props to DOM-safe button props. */
export function Button({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const action = resolveXmlString(props, 'action', ctx, '');
    const invalidate = resolveXmlStringArray(props, 'invalidate', ctx);
    const json = resolveXmlExpression(props, 'json');
    const method = resolveXmlString(props, 'method', ctx, 'POST');
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const variant = resolveXmlString(props, 'variant', ctx, 'default');
    const submit = resolveXmlBoolean(props, 'submit', ctx, false);
    const actionUrl = String(action ?? '');
    const requestUrl = useUrl(actionUrl);
    const invalidateRuntime = ctx.invalidate ?? (async () => {});
    const normalizedMethod = method.trim().toUpperCase();

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        /* Recreate any invalidated runtime sources after the action succeeds. */
        const ids = invalidate;
        const jsonValue = json ? json(ctx) : undefined;

        if (!actionUrl) {
            await invalidateRuntime(ids);

            return;
        }

        const init: RequestInit = { method: normalizedMethod };

        if (jsonValue !== undefined) {
            /* Resolve the compiled payload at click time so it sees the latest state. */
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

    if (submit) {
        return (
            <UIButton size={size as never} type="submit" variant={variant as never}>
                {renderNode(nodes, ctx)}
            </UIButton>
        );
    }

    if (actionUrl && normalizedMethod === 'GET') {
        return <a href={requestUrl}>{renderNode(nodes, ctx)}</a>;
    }

    return (
        <UIButton size={size as never} type="button" variant={variant as never} onClick={handleClick}>
            {renderNode(nodes, ctx)}
        </UIButton>
    );
}
