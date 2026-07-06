import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { headingId } from './heading';

/** Props accepted by the XML h1 bridge component. */

/** Renders a primary heading with typographic defaults. */
export function H1({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return (
        <Heading id={props.id || headingId(text)} level="h1">
            {text}
        </Heading>
    );
}
