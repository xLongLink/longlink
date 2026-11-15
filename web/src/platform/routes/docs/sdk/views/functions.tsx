import ViewLayout from './view-layout';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/shadcn/table';

// Describe the runtime bindings exposed to Views.
const functions = [
    {
        name: 'navigate(path)',
        description:
            'Navigates within the current Solution using a scoped path, or opens an HTTP(S) URL in a new tab. External URLs require user activation and open without an opener or referrer.'
    },
    {
        name: 'request(path, options)',
        description:
            'Requests a Solution operation and returns its data. Options support the HTTP method, JSON, form data, and binary responses. Successful writes automatically refresh cached View data. Failed HTTP requests reject with an Error containing an optional numeric status and a bounded client-facing message.'
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
            <Table className="[&_td]:whitespace-normal">
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
