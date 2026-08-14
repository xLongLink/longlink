import { Link as AstryxLink } from '@astryxdesign/core-0-3/Link';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveXml } from '../core/props';
import { useXmlRuntime } from '../core/context';
import { resolveAnchorUrl, resolveNavigationUrl } from '../core/url';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/Link?tab=properties
 * - href: string
 * - to: string
 * - isDisabled: bool
 * - children: ReactNode
 */
export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    if (nodes.length === 0) {
        throw new Error('Link requires child content');
    }

    const href = resolveXml(props, 'href', ctx);
    const to = resolveXml(props, 'to', ctx);
    const resolvedHref = resolveAnchorUrl(services.requestBaseUrl, typeof href === 'string' ? href : '');
    const resolvedTo = resolveNavigationUrl(services.navigationBaseUrl, typeof to === 'string' ? to : '');
    const isDisabled = resolveXml(props, 'isDisabled', ctx);

    return (
        <AstryxLink
            href={resolvedTo || resolvedHref || undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxLink>
    );
}
