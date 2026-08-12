import { Link as AstryxLink } from '@astryxdesign/core-0-3/Link';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlBoolean, isXmlEnum, isXmlString, resolveXml } from '../core/props';
import { resolveAnchorUrl, resolveNavigationUrl } from '../core/url';
import type { Props } from '../types';

/** Renders an Astryx link while keeping navigation destinations URL-safe. */
export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const href = resolveXml(props, 'href', ctx);
    const to = resolveXml(props, 'to', ctx);
    const resolvedHref = resolveAnchorUrl(services.requestBaseUrl, isXmlString(href) ? href : '');
    const resolvedTo = resolveNavigationUrl(services.navigationBaseUrl, isXmlString(to) ? to : '');
    const content = nodes.length > 0 ? renderNode(nodes, ctx) : undefined;
    const label = resolveXml(props, 'label', ctx);
    const colorValue = resolveXml(props, 'color', ctx);
    const color = isXmlEnum(colorValue, ['primary', 'secondary', 'disabled', 'placeholder', 'accent', 'inherit']) ? colorValue : 'accent';
    const hasUnderline = resolveXml(props, 'hasUnderline', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isExternalLink = resolveXml(props, 'isExternalLink', ctx);

    return (
        <AstryxLink
            color={color}
            hasUnderline={isXmlBoolean(hasUnderline) ? hasUnderline : undefined}
            href={resolvedTo || resolvedHref || undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isExternalLink={isXmlBoolean(isExternalLink) ? isExternalLink && Boolean(resolvedHref) : undefined}
            label={isXmlString(label) ? label : undefined}
        >
            {content}
        </AstryxLink>
    );
}
