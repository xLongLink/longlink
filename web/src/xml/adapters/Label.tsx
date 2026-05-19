import { Label as UILabel } from '@/components/ui/label';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML Label component. */

/** Renders a shadcn-backed label element for form controls. */
export function Label({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const htmlFor = resolveXmlString(props, 'htmlFor', ctx);

    return <UILabel htmlFor={htmlFor}>{renderNode(children ?? [], ctx)}</UILabel>;
}
