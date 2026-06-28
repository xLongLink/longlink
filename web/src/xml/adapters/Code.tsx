import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Renders inline code with monospace typography defaults. */
export function Code({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
            {text}
        </code>
    );
}
