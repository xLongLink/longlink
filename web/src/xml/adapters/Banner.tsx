import { Banner as AstryxBanner } from '@astryxdesign/core/Banner';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlLabel, resolveXmlString } from './props';

/** Renders a persistent Astryx status banner. */
export function Banner({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const title = resolveXmlLabel(props, ctx, 'Banner', 'title');
    const description = resolveXmlString(props, 'description', ctx);
    const status = resolveXmlEnum(props, 'status', ctx, ['info', 'warning', 'error', 'success'], 'info', 'Banner');
    const container = resolveXmlEnum(props, 'container', ctx, ['card', 'section'], 'card', 'Banner');

    return (
        <AstryxBanner
            container={container}
            defaultIsExpanded={resolveXmlBoolean(props, 'isExpanded', ctx, nodes.length > 0)}
            description={description || undefined}
            status={status}
            title={title}
        >
            {nodes.length > 0 ? renderNode(nodes, ctx) : undefined}
        </AstryxBanner>
    );
}
