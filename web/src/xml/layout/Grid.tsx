import type { CSSProperties, ReactNode } from 'react';

type GridProps = {
    children?: ReactNode;
    gap?: CSSProperties['gap'];
    columns?: CSSProperties['gridTemplateColumns'];
    align?: CSSProperties['alignItems'];
    justify?: CSSProperties['justifyItems'];
    style?: CSSProperties;
};

/** Renders a CSS grid container for XML layouts. */
export function Grid({ children, gap = '1rem', columns, align, justify, style }: GridProps) {
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
            {children}
        </div>
    );
}
