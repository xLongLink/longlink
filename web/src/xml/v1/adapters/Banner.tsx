import { Banner as AstryxBanner } from '@astryxdesign/core/Banner';
import { useXmlContext, useXmlServices } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlLabel, resolveXmlString } from '../core/props';
import type { Props } from '../types';

/** Renders a persistent Astryx status banner. */
export function Banner({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const services = useXmlServices();
    const title = resolveXmlLabel(props, ctx, services, 'Banner', 'title');
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
