import type { ComponentProps } from 'react';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

/**
 * Exposes shadcn table component to XML registry without extra behavior.
 */
export function Table(props: ComponentProps<typeof UITable>) {
    return <UITable {...props} />;
}

export default Table;

export { TableBody, TableCell, TableHead, TableHeader, TableRow };
