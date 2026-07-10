import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, GitPullRequest, PenLine, Settings2 } from 'lucide-react';

const applicationRoles = [
    {
        name: 'read',
        description: 'View and open the application runtime.',
        capabilities: 'Use read runtime methods such as GET.',
        icon: BookOpen,
    },
    {
        name: 'write',
        description: 'Read access plus update data through the application runtime.',
        capabilities: 'Use read and write runtime methods such as GET, POST, PUT, and PATCH.',
        icon: GitPullRequest,
    },
    {
        name: 'maintain',
        description: 'Write access plus manage application operations and access.',
        capabilities:
            'Fetch logs, update application member roles, delete the application, and use DELETE runtime methods.',
        icon: PenLine,
    },
    {
        name: 'admin',
        description: 'Highest application-specific access.',
        capabilities: 'Maintain access plus authority to assign application roles up to admin.',
        icon: Settings2,
    },
] as const;

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/applications.tsx',
};

export const content = (
    <Stack>
        <Heading id="applications" level="h1">
            Applications
        </Heading>
        <P>
            Applications are containerized LongLink SDK services deployed into an organization. The control plane reads
            application metadata from the image, provisions runtime resources, verifies the rollout, and routes
            authenticated users to the running service.
        </P>
        <Heading id="roles" level="h2">
            Roles
        </Heading>
        <P>Application roles are ordered from least access to most access:</P>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Role</TableHead>
                        <TableHead className="bg-muted/50">Description</TableHead>
                        <TableHead className="bg-muted/50">Capabilities</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {applicationRoles.map((role) => (
                        <TableRow key={role.name}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                        <role.icon aria-hidden={true} className="size-4" />
                                    </div>
                                    <Code>{role.name}</Code>
                                </div>
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">
                                {role.description}
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">
                                {role.capabilities}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </Stack>
);
