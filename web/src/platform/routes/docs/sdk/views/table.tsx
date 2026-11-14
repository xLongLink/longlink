import ViewLayout from './view-layout';
import { ModelDirectory } from '@/components/custom/model-directory';
import modelDirectorySource from '@/components/custom/model-directory?raw';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/shadcn/table';

/** Documents native shadcn table composition in LongLink Views. */
export default function TablePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Table"
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description:
                        'Compose TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, and TableCaption.'
                },
                {
                    name: 'className',
                    type: 'string',
                    description: 'Native table classes. Table parts also accept standard HTML attributes and events.'
                }
            ]}
            example={{
                title: 'Model directory',
                preview: <ModelDirectory />,
                code: modelDirectorySource,
                language: 'tsx'
            }}
        />
    );
}

/** Shows a small table using native shadcn parts without a data adapter. */
export function TableExample() {
    const projects = [
        { name: 'Website', status: 'Active' },
        { name: 'Mobile app', status: 'Draft' },
        { name: 'Dashboard', status: 'Active' }
    ];

    // Keep the catalog preview smaller than the full model directory.
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-border/50">
                {projects.map((project) => (
                    <TableRow key={project.name}>
                        <TableCell>{project.name}</TableCell>
                        <TableCell>{project.status}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
