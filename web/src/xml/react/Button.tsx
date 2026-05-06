import { Button as UIButton } from '@/ui/button';
import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, useContext, useUrl } from '@/xml';
import { toast } from 'sonner';

/** XML button adapter that maps action-layer props to DOM-safe button props. */
export function Button({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();

    const action = String(evaluate(rawProps.action ?? '', ctx) ?? '');
    const json = evaluate(rawProps.json ?? '', ctx);
    const requestUrl = useUrl(action);

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        if (!action) return;

        const response = await fetch(requestUrl, {
            method: 'POST',
            body: JSON.stringify(json),
            headers: { 'content-type': 'application/json' },
        });

        if (!response.ok) {
            toast.error(`Request failed with status ${response.status}`);
            return;
        }

        toast.success(`Request completed with status ${response.status}`);
    }

    return <UIButton onClick={handleClick}>{renderXml(children)}</UIButton>;
}
