import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { headingId } from './heading';

/** Renders a tertiary heading with typographic defaults. */
export function H3({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return (
        <Heading id={props.id || headingId(text)} level="h3">
            {text}
        </Heading>
    );
}
