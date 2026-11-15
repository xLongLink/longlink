import { ArrowUp, CheckCheck, EyeOff, Wrench } from 'lucide-react';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/table';

const solutionRoles = [
    { name: 'read', access: 'View Solution data and send GET requests', icon: EyeOff },
    {
        name: 'write',
        access: 'Read access plus create and update Solution data with POST, PUT, and PATCH requests',
        icon: ArrowUp
    },
    {
        name: 'maintain',
        access: 'Write access plus DELETE requests, Solution deployment, and runtime logs',
        icon: Wrench
    },
    { name: 'admin', access: 'Full access to Solution requests, deployment, and runtime logs', icon: CheckCheck }
];

const article = {
    title: 'Solutions | LongLink Platform Documentation',
    description: 'Learn how the Platform deploys Solutions and manages their resources and permissions.',
    toc: [{ id: 'solutions', label: 'Solutions', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/solutions.tsx'
};

export default function Solutions() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="solutions">
                    Solutions
                </h1>
                <p>
                    Solutions belong to an organization and run as separate services. The Platform manages their
                    deployment and operation. Each Solution gets its own schema in the organization’s PostgreSQL
                    database and its own dedicated prefix in the storage bucket. When not in use, Solutions
                    automatically scale to zero.
                </p>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <span className="font-semibold">User permissions</span>
                    <Table wrap>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Roles</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {solutionRoles.map(({ access, icon: RoleIcon, name }) => (
                                <TableRow key={name}>
                                    <TableCell>
                                        <Stack gap={0}>
                                            <Stack direction="horizontal" gap={2} align="center">
                                                <RoleIcon aria-hidden="true" className="text-primary" size={16} />
                                                <span className="font-semibold capitalize">{name}</span>
                                            </Stack>
                                            <span className="text-xs text-muted-foreground">{access}</span>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
