import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import type { CSSProperties } from 'react';

type GridProps = {
    children?: RenderableASTNode;
    gap?: CSSProperties['gap'];
    columns?: CSSProperties['gridTemplateColumns'];
    align?: CSSProperties['alignItems'];
    justify?: CSSProperties['justifyItems'];
    style?: CSSProperties;
};

export function Grid({ children, gap = '1rem', columns, align, justify, style }: GridProps) {
    const { ctx } = useRuntime();
    return (
        <div
            style={{
                display: 'grid',
                gap,
                gridTemplateColumns: columns,
                alignItems: align,
                justifyItems: justify,
                ...style,
            }}
        >
            {renderNode(children, ctx)}
        </div>
    );
}
