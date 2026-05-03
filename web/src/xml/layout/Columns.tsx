import { Children, isValidElement, type ReactNode } from 'react';

type ColumnsProps = {
    gap?: number | string;
    widths?: number[];
    children?: ReactNode;
};

type ColumnProps = {
    span?: number;
    width?: number;
    children?: ReactNode;
};

/** Converts numeric layout values to CSS pixel values. */
function px(value: number | string | undefined, fallback: number) {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    if (typeof value === 'string' && value.trim()) {
        return /^\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
    }

    return `${fallback}px`;
}

/** Converts relative column widths into CSS grid tracks. */
function toGridTemplate(widths: number[]) {
    const total = widths.reduce((sum, width) => sum + width, 0);

    if (total <= 0) {
        return `repeat(${widths.length || 1}, minmax(0, 1fr))`;
    }

    return widths.map((width) => `minmax(0, ${(width / total) * 100}%)`).join(' ');
}

/** Checks whether any child column asks for explicit 12-column placement. */
function hasExplicitColumnPlacement(children: ReactNode) {
    return Children.toArray(children).some((child) => {
        if (!isValidElement<ColumnProps>(child)) {
            return false;
        }

        return child.props.span !== undefined || child.props.width !== undefined;
    });
}

/** Renders a responsive grid for XML column layouts. */
export function Columns({ gap = 16, widths, children }: ColumnsProps) {
    const style =
        Array.isArray(widths) && widths.length > 0
            ? { gridTemplateColumns: toGridTemplate(widths) }
            : hasExplicitColumnPlacement(children)
              ? { gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }
              : { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))' };

    return (
        <div className="grid" style={{ ...style, gap: px(gap, 16) }}>
            {children}
        </div>
    );
}

/** Renders a single XML layout column. */
export function Column({ children, span, width }: ColumnProps) {
    const explicitSpan = span ?? width;
    const safeSpan = explicitSpan === undefined ? undefined : Math.max(1, Math.min(12, Number(explicitSpan)));

    return (
        <div
            className="space-y-4"
            style={safeSpan === undefined ? undefined : { gridColumn: `span ${safeSpan} / span ${safeSpan}` }}
        >
            {children}
        </div>
    );
}

export default Columns;
