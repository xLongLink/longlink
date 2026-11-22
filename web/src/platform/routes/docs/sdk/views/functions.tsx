import ViewLayout from './view-layout';
import { Stack, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink';

// Describe the runtime bindings exposed to Views.
const functions = [
    {
        name: 'navigate(path)',
        description:
            'Navigates within the current Solution using a scoped path, or opens an HTTP(S) URL in a new tab. External URLs require user activation and open without an opener or referrer.'
    },
    {
        name: 'download(path, filename)',
        description: 'Downloads a Solution attachment to the supplied filename without opening it inside the View.'
    }
];

/** Documents the non-hook bindings exposed by the View runtime. */
export default function FunctionsPage() {
    // Render the runtime-specific functions table.
    return (
        <ViewLayout name="Functions" toc={[{ id: 'functions', label: 'Functions', level: 2 }]}>
            <h2 className="font-semibold tracking-tight text-3xl" id="functions">
                Functions
            </h2>
            <Table wrap>
                <TableHeader>
                    <TableRow>
                        <TableHead>Function</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {functions.map((row) => (
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
