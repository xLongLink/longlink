import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table as UITable } from '@/ui/table';
type TableProps = Record<string, never>;

export function Table(_props: TableProps) {
    return <UITable />;
}
export { TableBody, TableCell, TableHead, TableHeader, TableRow };
