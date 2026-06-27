import { Heading } from '@/components/ui/heading';
import { resolveTranslation } from '@xml/core/i18n';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML h3 bridge component. */

/** Renders a tertiary heading with typographic defaults. */
export function H3({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const localizedText = props.i18n ? resolveTranslation(props, ctx) : undefined;
    const text = localizedText ?? renderNode(nodes, ctx);
    const source = localizedText ? [{ name: 'Text', params: { value: localizedText } }] : nodes;

    return (
        <Heading anchorClassName="-translate-x-5" level="h3" source={source}>
            {text}
        </Heading>
    );
}
