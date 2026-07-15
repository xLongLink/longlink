import { Link } from 'react-router';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { isAppRelativeUrl, resolveUrl, useAnchorUrl } from '@/xml/core/url';
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
    const resolvedTo = to && isAppRelativeUrl(to) ? resolveUrl(String(ctx.navigationBaseUrl ?? ''), to) : '';

    // Use router links for safe app-relative destinations.
    if (to && resolvedTo) {
        return (
            <Link
                className={
                    active === 'always'
                        ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
                        : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80'
                }
                to={resolvedTo}
            >
                {props.i18n ? childContent : null}
                {text}
            </Link>
        );
    }

    return (
        <a
            className={
                active === 'always'
                    ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
                    : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80'
            }
            {...(resolvedHref ? { href: resolvedHref } : {})}
        >
            {props.i18n ? childContent : null}
            {text}
        </a>
    );
}
