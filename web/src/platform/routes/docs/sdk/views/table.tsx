import ViewLayout from './view-layout';
import { Globe, Smartphone, LayoutDashboard } from 'lucide-react';
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
                title: 'Projects',
                preview: <TableExample />,
                code: `import { Globe, Smartphone, LayoutDashboard } from 'lucide-react';

function Example() {
  const projects = [
    { name: 'Website', status: 'Active', icon: Globe },
    { name: 'Mobile app', status: 'Draft', icon: Smartphone },
    { name: 'Dashboard', status: 'Active', icon: LayoutDashboard }
  ];

  return (
    <Table aria-label="Projects">
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.name}>
            <TableCell>
              <span className="flex items-center gap-2">
                <project.icon aria-hidden="true" className="size-4 text-muted-foreground" />
                {project.name}
              </span>
            </TableCell>
            <TableCell>{project.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}`,
                language: 'tsx'
            }}
        />
    );
}

/** Shows a small table using native shadcn parts without a data adapter. */
export function TableExample() {
    const projects = [
        { name: 'Website', status: 'Active', icon: Globe },
        { name: 'Mobile app', status: 'Draft', icon: Smartphone },
        { name: 'Dashboard', status: 'Active', icon: LayoutDashboard }
    ];

    // Pair each project with an icon in the shared documentation and catalog preview.
    return (
        <Table aria-label="Projects">
            <TableHeader>
                <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {projects.map((project) => (
                    <TableRow key={project.name}>
                        <TableCell>
                            <span className="flex items-center gap-2">
                                <project.icon aria-hidden="true" className="size-4 text-muted-foreground" />
                                {project.name}
                            </span>
                        </TableCell>
                        <TableCell>{project.status}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
