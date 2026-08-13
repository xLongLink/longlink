import { Link as AstryxLink } from '@astryxdesign/core-0-3/Link';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveXml } from '../core/props';
import { useXmlRuntime } from '../core/context';
import { resolveAnchorUrl, resolveNavigationUrl } from '../core/url';

/**
 * https://astryx.atmeta.com/components/Link?tab=properties
 * - href: string
 * - to: string
 * - color: str
 * - hasUnderline: bool
 * - isDisabled: bool
 * - isExternalLink: bool
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
    const content = renderNode(nodes, ctx);
    const colorValue = resolveXml(props, 'color', ctx);
    const color =
        colorValue === 'primary' ||
        colorValue === 'secondary' ||
        colorValue === 'disabled' ||
        colorValue === 'placeholder' ||
        colorValue === 'accent' ||
        colorValue === 'inherit'
            ? colorValue
            : 'accent';
    const hasUnderline = resolveXml(props, 'hasUnderline', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isExternalLink = resolveXml(props, 'isExternalLink', ctx);

    return (
        <AstryxLink
            color={color}
            hasUnderline={typeof hasUnderline === 'boolean' ? hasUnderline : undefined}
            href={resolvedTo || resolvedHref || undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isExternalLink={typeof isExternalLink === 'boolean' ? isExternalLink && Boolean(resolvedHref) : undefined}
        >
            {content}
        </AstryxLink>
    );
}
