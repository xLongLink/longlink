import { Button as UIButton } from '@/ui/button';
import type { ASTNode, XMLComponent } from '@xml';
import { renderNode, useContext, useUrl } from '@xml';
import type { ExpressionResolver } from '@xml/core/expressions';
import { toast } from 'sonner';

/** Props accepted by the XML Button component. */
export interface ButtonProps {
    action?: string;
    invalidate?: string | string[];
    children?: ASTNode | ASTNode[] | null;
    json?: ExpressionResolver | null;
    method?: string;
    size?: string;
    variant?: string;
}

/** XML button adapter that maps action-layer props to DOM-safe button props. */
export const Button: XMLComponent<ButtonProps> = ({ action, json, method = 'POST', children }) => {
    const { ctx } = useContext();
    const actionUrl = String(action ?? '');
    const requestUrl = useUrl(actionUrl);

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        if (!actionUrl) return;

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

        toast.success(`Request completed with status ${response.status}`);
    }

    return <UIButton onClick={handleClick}>{renderNode(children ?? null, ctx)}</UIButton>;
};
