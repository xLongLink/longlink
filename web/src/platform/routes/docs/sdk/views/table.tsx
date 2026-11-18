import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
import { Icon } from '@/components/longlink/display/icon';
import { Stack } from '@/components/longlink/layout/stack';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Documents Table in LongLink Views. */
export default function TablePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Table"
            properties={[
                { name: 'children', type: 'ReactNode' },
                { name: 'wrap', type: 'boolean' },
                { name: 'TableHead.align', type: '"start" | "center" | "end"' },
                { name: 'TableCell.align', type: '"start" | "center" | "end"' }
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
                <Stack direction="horizontal" align="center" gap={2}>
                  <Icon icon={project.icon} size="sm" />
                  {project.name}
                </Stack>
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
                                <Stack direction="horizontal" align="center" gap={2}>
                                    <Icon icon={project.icon} size="sm" />
                                    {project.name}
                                </Stack>
                            </TableCell>
                            <TableCell>{project.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}
