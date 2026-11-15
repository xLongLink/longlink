import ViewLayout from './view-layout';
import { Icon } from '@/components/longlink/icon';
import { Box } from '@/components/longlink/layout/box';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/table';

/** Documents Table in LongLink Views. */
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
                { name: 'wrap', type: 'boolean', description: 'Wraps cell text instead of keeping it on one line.' },
                { name: 'TableHead.align', type: '"start" | "center" | "end"', description: 'Header text alignment.' },
                { name: 'TableCell.align', type: '"start" | "center" | "end"', description: 'Cell text alignment.' }
            ]}
            example={{
                title: 'Projects',
                preview: <TableExample />,
                code: `function Example() {
  const projects = [
    { name: 'Website', status: 'Active', icon: 'globe' },
    { name: 'Mobile app', status: 'Draft', icon: 'smartphone' },
    { name: 'Dashboard', status: 'Active', icon: 'layout-dashboard' }
  ];

  return (
    <Box width="80%">
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
                  <Icon icon={project.icon} size="sm" />
                  {project.name}
                </span>
              </TableCell>
              <TableCell>{project.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}`
            }}
        />
    );
}

/** Shows a small table without a data adapter. */
export function TableExample() {
    const projects = [
        { name: 'Website', status: 'Active', icon: 'globe' },
        { name: 'Mobile app', status: 'Draft', icon: 'smartphone' },
        { name: 'Dashboard', status: 'Active', icon: 'layout-dashboard' }
    ] as const;

    // Pair each project with an icon in the shared documentation and catalog preview.
    return (
        <Box width="80%">
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
                                    <Icon icon={project.icon} size="sm" />
                                    {project.name}
                                </span>
                            </TableCell>
                            <TableCell>{project.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}
