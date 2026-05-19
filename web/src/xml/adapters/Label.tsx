import { Label as UILabel } from '@/components/ui/label';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Props accepted by the XML Label component. */

/** Renders a shadcn-backed label element for form controls. */
export function Label({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const htmlFor = resolveXmlString(props, 'htmlFor', ctx);

    return <UILabel htmlFor={htmlFor}>{renderNode(children ?? [], ctx)}</UILabel>;
}
