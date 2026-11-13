import ViewLayout from './view-layout';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';

/** Documents the native shadcn table family. */
export default function TablePage() {
    return (
        <ViewLayout
            name="Table"
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description:
                        'Compose TableCaption, TableHeader, TableBody, TableFooter, TableRow, TableHead, and TableCell. Each accepts its native HTML element props.'
                }
            ]}
            example={{
                title: 'Table',
                preview: <TableExample />,
                code: `<Table aria-label="Orders">
  <TableCaption>Current orders</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Item</TableHead>
      <TableHead scope="col">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Order</TableCell>
      <TableCell>Open</TableCell>
    </TableRow>
  </TableBody>
</Table>`
            }}
        />
    );
}

/** Renders a composed native table. */
export function TableExample() {
    return (
        <Table aria-label="Orders">
            <TableCaption>Current orders</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead scope="col">Item</TableHead>
                    <TableHead scope="col">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Open</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
