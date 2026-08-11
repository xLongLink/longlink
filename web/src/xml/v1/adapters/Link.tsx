import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { useContext } from 'react';
import { useXmlContext, useXmlServices } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXmlBoolean, resolveXmlContent, resolveXmlEnum, resolveXmlString } from '../core/props';
import { BaseUrlContext, resolveAnchorUrl, resolveNavigationUrl } from '../core/url';
import type { Props } from '../types';

/** Renders an Astryx link while keeping navigation destinations URL-safe. */
export function Link({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const services = useXmlServices();
    const baseUrl = useContext(BaseUrlContext);
    const href = resolveXmlString(props, 'href', ctx);
    const to = resolveXmlString(props, 'to', ctx);
    const resolvedHref = resolveAnchorUrl(baseUrl, href);
    const resolvedTo = resolveNavigationUrl(services.navigationBaseUrl, to);
    const content = resolveXmlContent(props, ctx, services, undefined, () => renderNode(nodes, ctx));
    const label = resolveXmlString(props, 'label', ctx);
    const color = resolveXmlEnum(
        props,
        'color',
        ctx,
        ['primary', 'secondary', 'disabled', 'placeholder', 'accent', 'inherit'],
        'accent',
        'Link'
    );
    const hasUnderline = resolveXmlBoolean(props, 'hasUnderline', ctx, false);
    const isDisabled = resolveXmlBoolean(props, 'isDisabled', ctx, false);
    const isExternalLink = resolveXmlBoolean(props, 'isExternalLink', ctx, false);

    return (
        <AstryxLink
            color={color}
            hasUnderline={hasUnderline}
            href={resolvedTo || resolvedHref || undefined}
            isDisabled={isDisabled}
            isExternalLink={isExternalLink && Boolean(resolvedHref)}
            label={label || undefined}
        >
            {content}
        </AstryxLink>
    );
}
