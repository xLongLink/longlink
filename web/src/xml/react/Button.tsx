import { Button as UIButton } from '@/ui/button';
import type { XMLComponent } from '@/xml';
import { renderNode, useContext, useUrl } from '@/xml';
import { toast } from 'sonner';

/** Props accepted by the XML Button component. */
export interface ButtonProps {
    action?: (ctx: ReturnType<typeof useContext>['ctx']) => unknown;
    children?: unknown;
    json?: (ctx: ReturnType<typeof useContext>['ctx']) => unknown;
    [key: string]: unknown;
}

/** XML button adapter that maps action-layer props to DOM-safe button props. */
export const Button: XMLComponent<ButtonProps> = ({ props, children }) => {
    const { ctx } = useContext();
    const { action, json } = props;

    const actionUrl = String(action?.(ctx) ?? '');
    const jsonValue = json?.(ctx);
    const requestUrl = useUrl(actionUrl);

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        if (!actionUrl) return;

        const response = await fetch(requestUrl, {
            method: 'POST',
            body: JSON.stringify(jsonValue),
            headers: { 'content-type': 'application/json' },
        });

        if (!response.ok) {
            toast.error(`Request failed with status ${response.status}`);
            return;
        }

        toast.success(`Request completed with status ${response.status}`);
    }

    return <UIButton onClick={handleClick}>{renderNode(children)}</UIButton>;
};
