import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Renders inline code with monospace typography defaults. */
export function Code({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
            {renderNode(children ?? [], ctx)}
        </code>
    );
}
