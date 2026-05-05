import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table as UITable } from '@/ui/table';
import { type ComponentProps } from 'react';
export function Table(props: ComponentProps<typeof UITable>) {
    return <UITable {...props} />;
}
export default Table;
export { TableBody, TableCell, TableHead, TableHeader, TableRow };
