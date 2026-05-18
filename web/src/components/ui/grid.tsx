import * as React from 'react';

import { cn } from '@/lib/utils';

type GridProps = React.ComponentProps<'div'> & {
    templateColumns?: string;
};

/** Renders a full-width grid shell. */
function Grid({ className, style, templateColumns, ...props }: GridProps) {
    const gridStyle = {
        ...(style ?? {}),
        ...(templateColumns ? { gridTemplateColumns: templateColumns } : {}),
    };

    return <div data-slot="grid" className={cn('grid w-full gap-6', className)} style={gridStyle} {...props} />;
}

export { Grid };
