import { Button as UIButton } from '@/ui/button';
import type { ASTNode, RenderableASTNode, XMLComponent } from '@xml';
import { evaluate, renderNode, useContext, useUrl } from '@xml';
import { toast } from 'sonner';

/** Props accepted by the XML Button component. */
export interface ButtonProps {
    action?: string;
    invalidate?: string | string[];
    children?: RenderableASTNode | string | number | boolean;
    json?: object | string | number | boolean | null;
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

        /* Resolve request payload at click time so sibling state has already populated the scope. */
        const jsonValue = typeof json === 'string' ? evaluate(json, ctx) : json;

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

    const content: RenderableASTNode =
        typeof children === 'string' || typeof children === 'number' || typeof children === 'boolean'
            ? ({ name: 'Text', params: { value: String(children) } } satisfies ASTNode)
            : (children ?? null);

    return <UIButton onClick={handleClick}>{renderNode(content, ctx)}</UIButton>;
};
