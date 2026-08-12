import { Link as AstryxLink } from '@astryxdesign/core-0-3/Link';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXml } from '../core/props';
import { resolveAnchorUrl, resolveNavigationUrl } from '../core/url';
import type { Props } from '../types';

/** Renders an Astryx link while keeping navigation destinations URL-safe. */
export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const href = resolveXml(props, 'href', ctx);
    const to = resolveXml(props, 'to', ctx);
    const resolvedHref = resolveAnchorUrl(services.requestBaseUrl, typeof href === 'string' ? href : '');
    const resolvedTo = resolveNavigationUrl(services.navigationBaseUrl, typeof to === 'string' ? to : '');
    const content = nodes.length > 0 ? renderNode(nodes, ctx) : undefined;
    const label = resolveXml(props, 'label', ctx);
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
            label={typeof label === 'string' ? label : undefined}
        >
            {content}
        </AstryxLink>
    );
}
