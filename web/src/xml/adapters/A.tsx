import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import { resolveAnchorUrl, useAnchorUrl } from '@/xml/core/url';
import type { Props } from '@/xml/types';
import { Link } from 'react-router';
import { resolveXmlString } from './props';

/** Renders a linked anchor with standard styling. */
export function A({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const childContent = renderNode(nodes, ctx);
    const text = props.i18n ? resolveTranslation(props, ctx) : childContent;
    const active = resolveXmlString(props, 'active', ctx);
    const href = resolveXmlString(props, 'href', ctx, '');
    const to = resolveXmlString(props, 'to', ctx, '');
    const resolvedHref = useAnchorUrl(href);
    const resolvedTo = to ? resolveAnchorUrl(String(ctx.navigationBaseUrl ?? ''), to) : '';
    const linkClassName =
        active === 'always'
            ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
            : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80';

    if (to && resolvedTo) {
        return (
            <Link className={linkClassName} to={resolvedTo}>
                {props.i18n ? childContent : null}
                {text}
            </Link>
        );
    }

    return (
        <a className={linkClassName} {...(resolvedHref ? { href: resolvedHref } : {})}>
            {props.i18n ? childContent : null}
            {text}
        </a>
    );
}
