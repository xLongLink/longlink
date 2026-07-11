import * as React from 'react';
import { cn } from '@/lib/utils';

type GridProps = React.ComponentProps<'div'> & {
    columns?: string | number;
};

/** Renders a full-width grid shell. */
function Grid({ className, style, columns, ...props }: GridProps) {
    // Convert a numeric column count into an equal-width CSS grid template.
    const templateColumns =
        columns == null
            ? undefined
            : typeof columns === 'number' || /^\d+$/.test(String(columns))
              ? `repeat(${String(columns)}, minmax(0, 1fr))`
              : String(columns);

    const gridStyle = {
        ...(style ?? {}),
        ...(templateColumns ? { gridTemplateColumns: templateColumns } : {}),
    };

    return <div data-slot="grid" className={cn('grid w-full gap-6', className)} style={gridStyle} {...props} />;
}

export { Grid };
