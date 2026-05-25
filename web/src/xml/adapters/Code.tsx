import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Renders inline code with monospace typography defaults. */
export function Code({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
            {renderNode(nodes, ctx)}
        </code>
    );
}
