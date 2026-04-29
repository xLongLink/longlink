import { Fragment, type ComponentProps } from 'react';
import { RuntimeProvider, useRuntime } from '../runtime';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

/**
 * Exposes shadcn table component to XML registry without extra behavior.
 */
export function Table(props: ComponentProps<typeof UITable>) {
    const runtime = useRuntime();
    const { children, ...rest } = props;
    const data = (rest as { data?: unknown }).data;
    const rows =
        typeof data === 'string'
            ? /* Allow XML templates to pass JSON data as an interpolated string. */
              (() => {
                  try {
                      return JSON.parse(data);
                  } catch {
                      return data;
                  }
              })()
            : data;

    if (!Array.isArray(rows)) {
        return <UITable {...props} />;
    }

    /* Render each row with the current item injected into scope. */
    return (
        <UITable {...rest}>
            <TableBody>
                {rows.map((row, index) => {
                    const rowCtx = {
                        ...runtime.ctx,
                        scope: {
                            ...runtime.ctx.scope,
                            ...(row && typeof row === 'object' ? (row as Record<string, unknown>) : { value: row }),
                            $index: index,
                        },
                    };

                    return (
                        <Fragment key={index}>
                            <RuntimeProvider value={{ ...runtime, ctx: rowCtx }}>{children}</RuntimeProvider>
                        </Fragment>
                    );
                })}
            </TableBody>
        </UITable>
    );
}

export default Table;

export { TableBody, TableCell, TableHead, TableHeader, TableRow };
