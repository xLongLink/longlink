import { cn } from '@/lib/utils';
import { Button as UIButton, buttonVariants } from '@ui/button';
import type { ASTNode } from '@xml';
import { renderNode, useContext, useUrl } from '@xml';
import type { ExpressionResolver } from '@xml/core/expressions';
import { Link } from 'react-router';
import { toast } from 'sonner';

/** Props accepted by the XML Button component. */
export interface ButtonProps {
    action?: string;
    href?: string;
    invalidate?: string[];
    children?: ASTNode | ASTNode[] | null;
    json?: ExpressionResolver | null;
    method?: string;
    size?: string;
    variant?: string;
}

/** XML button adapter that maps action-layer props to DOM-safe button props. */
export function Button({
    action = '',
    href = '',
    invalidate = [],
    json,
    method = 'POST',
    size = 'default',
    variant = 'default',
    children,
}: ButtonProps) {
    const { ctx } = useContext();
    const actionUrl = String(action ?? '');
    const hrefUrl = String(href ?? '');
    const requestUrl = useUrl(actionUrl);
    const linkUrl = useUrl(hrefUrl);
    const invalidateRuntime = ctx.invalidate ?? (async () => {});

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        /* Recreate any invalidated runtime sources after the action succeeds. */
        const ids = invalidate;

        if (!actionUrl) {
            await invalidateRuntime(ids);

            return;
        }

        /* Resolve the compiled payload at click time so it sees the latest state. */
        const jsonValue = json ? json(ctx) : null;

        const response = await fetch(requestUrl, {
            method,
            body: JSON.stringify(jsonValue),
            headers: { 'content-type': 'application/json' },
        });

        if (!response.ok) {
            toast.error(`Request failed with status ${response.status}`);
            return;
        }

        await invalidateRuntime(ids);

        toast.success(`Request completed with status ${response.status}`);
    }

    if (hrefUrl) {
        return (
            <Link className={cn(buttonVariants({ variant: variant as never, size: size as never }))} to={linkUrl}>
                {renderNode(children ?? null, ctx)}
            </Link>
        );
    }

    return (
        <UIButton size={size as never} variant={variant as never} onClick={handleClick}>
            {renderNode(children ?? null, ctx)}
        </UIButton>
    );
}
