import * as React from 'react';

import { cn } from '@/lib/utils';

type ColumnsContextValue = {
    templateColumns?: string;
};

type ColumnsProps = React.ComponentProps<'div'> & {
    templateColumns?: string;
};

type ColumnProps = React.ComponentProps<'div'> & {
    width?: string | number;
};

const ColumnsContext = React.createContext<ColumnsContextValue | null>(null);

/** Renders a full-width column row shell. */
function Columns({ className, style, templateColumns, ...props }: ColumnsProps) {
    const columnsStyle = {
        ...(style ?? {}),
        ...(templateColumns ? { gridTemplateColumns: templateColumns } : {}),
    };

    return (
        <ColumnsContext.Provider value={templateColumns ? { templateColumns } : null}>
            <div
                data-slot="columns"
                className={cn('flex w-full flex-col gap-4 md:grid md:items-stretch md:gap-6', className)}
                style={columnsStyle}
                {...props}
            />
        </ColumnsContext.Provider>
    );
}

/** Renders a single column with a percentage width. */
function Column({ className, style, width = '100', ...props }: ColumnProps) {
    const columnsContext = React.useContext(ColumnsContext);
    const numericWidth = Number.parseFloat(String(width));
    const resolvedWidth = Number.isFinite(numericWidth) ? numericWidth : 100;
    const columnStyle = columnsContext
        ? { minWidth: 0, width: '100%', ...style }
        : {
              flex: `0 0 ${resolvedWidth}%`,
              maxWidth: `${resolvedWidth}%`,
              width: '100%',
              ...style,
          };

    return (
        <div
            data-slot="column"
            className={cn('flex min-w-0 w-full flex-col gap-6', className)}
            style={columnStyle}
            {...props}
        />
    );
}

export { Column, Columns };
