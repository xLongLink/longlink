import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Renders a linked anchor with standard styling. */
export function A({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const active = resolveXmlString(props, 'active', ctx);
    const href = resolveXmlString(props, 'href', ctx, '');
    const linkClassName =
        active === 'always'
            ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
            : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80';

    return (
        <a className={linkClassName} {...(href ? { href } : {})}>
            {renderNode(children ?? [], ctx)}
        </a>
    );
}
