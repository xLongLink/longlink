import { Label as UILabel } from '@/components/ui/label';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';
import { resolveXmlString } from './props';

/** Renders a shadcn-backed label element for form controls. */
export function Label({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);
    const htmlFor = resolveXmlString(props, 'htmlFor', ctx);

    return <UILabel htmlFor={htmlFor}>{text}</UILabel>;
}
