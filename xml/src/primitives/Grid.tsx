import type { CSSProperties, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

type GridProps = {
    children?: ReactNode;
    gap?: CSSProperties['gap'];
    columns?: CSSProperties['gridTemplateColumns'];
    align?: CSSProperties['alignItems'];
    justify?: CSSProperties['justifyItems'];
    style?: CSSProperties;
};

/**
 * Renders a CSS grid container. Maps XML attributes directly to the
 * corresponding CSS grid properties (`gap`, `columns`, `align`, `justify`).
 * Any additional inline styles can be passed via the `style` prop.
 */
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
