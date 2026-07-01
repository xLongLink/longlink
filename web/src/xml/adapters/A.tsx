import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import { useUrl } from '@xml/core/url';
import type { Props } from '@xml/types';
import { resolveXmlString } from './props';

/** Renders a linked anchor with standard styling. */
export function A({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const childContent = renderNode(nodes, ctx);
    const text = props.i18n ? resolveTranslation(props, ctx) : childContent;
    const active = resolveXmlString(props, 'active', ctx);
    const href = resolveXmlString(props, 'href', ctx, '');
    const resolvedHref = useUrl(href);
    const linkClassName =
        active === 'always'
            ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
            : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80';

    return (
        <a className={linkClassName} {...(href ? { href: resolvedHref } : {})}>
            {props.i18n ? childContent : null}
            {text}
        </a>
    );
}
