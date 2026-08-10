import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { useContext } from 'react';
import { useXmlContext } from '../core/context';
import { resolveTranslation } from '../core/i18n';
import { renderNode } from '../core/node';
import { BaseUrlContext, resolveAnchorUrl, resolveNavigationUrl } from '../core/url';
import type { Props } from '../types';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlString } from './props';

/** Renders an Astryx link while keeping navigation destinations URL-safe. */
export function Link({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const baseUrl = useContext(BaseUrlContext);
    const href = resolveXmlString(props, 'href', ctx);
    const to = resolveXmlString(props, 'to', ctx);
    const resolvedHref = resolveAnchorUrl(baseUrl, href);
    const resolvedTo = resolveNavigationUrl(String(ctx.navigationBaseUrl ?? ''), to);
    const content = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);
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
