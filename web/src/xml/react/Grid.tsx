import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, useContext } from '@/xml';
import type { CSSProperties } from 'react';

type GridProps = {
    children?: RenderableASTNode;
    gap?: CSSProperties['gap'];
    columns?: CSSProperties['gridTemplateColumns'];
    align?: CSSProperties['alignItems'];
    justify?: CSSProperties['justifyItems'];
    style?: CSSProperties;
};

export function Grid({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const gap = evaluate(props.gap ?? '1rem', context, 'string');
    const columns = evaluate(props.columns ?? '', context, 'string');
    const align = evaluate(props.align ?? '', context, 'string');
    const justify = evaluate(props.justify ?? '', context, 'string');
    return (
        <div
            style={{
                display: 'grid',
                gap,
                gridTemplateColumns: columns,
                alignItems: align,
                justifyItems: justify,
            }}
        >
            {renderNode(children, context.ctx)}
        </div>
    );
}
