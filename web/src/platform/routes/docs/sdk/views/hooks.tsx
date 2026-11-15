import ViewLayout from './view-layout';
import { viewHooks } from '@/lib/documentation';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Documents the hooks exposed by the View runtime. */
export default function HooksPage() {
    // Render the runtime-specific hooks table.
    return (
        <ViewLayout name="Hooks" toc={[{ id: 'hooks', label: 'Hooks', level: 2 }]}>
            <h2 className="font-semibold tracking-tight text-3xl" id="hooks">
                Hooks
            </h2>
            <Table wrap>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hook</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {viewHooks.map((row) => (
                        <TableRow key={row.name}>
                            <TableCell>
                                <Stack gap={0}>
                                    <span>{row.name}</span>
                                    <span className="text-xs text-muted-foreground">{row.description}</span>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ViewLayout>
    );
}
