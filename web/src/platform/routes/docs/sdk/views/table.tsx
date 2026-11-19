import ViewLayout from './view-layout';
import {
    Box,
    Icon,
    Stack,
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
    TableCaption
} from '@/components/longlink';

/** Documents Table in LongLink Views. */
export default function TablePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Table"
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
        <TableCaption>Current projects and their status</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Project</TableHead>
            <TableHead scope="col">Status</TableHead>
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
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>{projects.length} projects</TableCell>
          </TableRow>
        </TableFooter>
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
                <TableCaption>Current projects and their status</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col">Project</TableHead>
                        <TableHead scope="col">Status</TableHead>
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
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>{projects.length} projects</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </Box>
    );
}
