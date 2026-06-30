import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML h3 bridge component. */

/** Renders a tertiary heading with typographic defaults. */
export function H3({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return (
        <Heading anchorClassName="-translate-x-5" level="h3" source={nodes}>
            {text}
        </Heading>
    );
}
