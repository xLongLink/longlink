import {
    AppWindow,
    BookOpen,
    Building2,
    Crown,
    Database,
    GitPullRequest,
    HardDrive,
    PenLine,
    Settings2,
    UsersRound,
} from 'lucide-react';
import { P } from '@/components/ui/p';
import { Code } from '@/components/ui/code';
import { Stack } from '@/components/ui/stack';
import { Heading } from '@/components/ui/heading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const organizationRoles = [
    {
        name: 'read',
        access: 'View organization data and access assigned resources.',
        icon: BookOpen,
    },
    {
        name: 'write',
        access: 'Read access plus create and update supported organization resources.',
        icon: GitPullRequest,
    },
    {
        name: 'maintain',
        access: 'Write access plus invitations, application creation, previews, and runtime access.',
        icon: PenLine,
    },
    {
        name: 'admin',
        access: 'Full access to roles, invitations, applications, previews, and runtime access.',
        icon: Settings2,
    },
    {
        name: 'owner',
        access: 'Highest access to ownership, settings, members, applications, and resources.',
        icon: Crown,
    },
] as const;

/** Renders the organization resource ownership diagram. */
function OrganizationResourcesDiagram() {
    return (
        <div className="rounded-md border bg-muted/10 p-4">
            <div className="grid gap-4 lg:grid-cols-4">
                <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center lg:col-span-4">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <Building2 aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">Organization</div>
                    </div>
                </div>
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <UsersRound aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">Users</div>
                        <div className="mt-1 text-sm text-muted-foreground">Members and roles</div>
                    </div>
                </div>
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <Database aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">Database</div>
                        <div className="mt-1 text-sm text-muted-foreground">Database schemas</div>
                    </div>
                </div>
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <HardDrive aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">File Storage</div>
                        <div className="mt-1 text-sm text-muted-foreground">One bucket with scoped prefixes</div>
                    </div>
                </div>
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <AppWindow aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">Applications</div>
                        <div className="mt-1 text-sm text-muted-foreground">Runtime services</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/organizations.tsx',
};

export const content = (
    <Stack>
        <Heading id="organizations" level="h1">
            Organizations
        </Heading>
        <P>
            Organizations are the tenant boundary in LongLink. They group members, invitations, Applications, and their
            immutable compute, database, and storage registry assignments.
        </P>
        <P>
            Every application belongs to one organization. Organization membership controls who can see the workspace,
            manage people, deploy applications, inspect resources, and open application runtimes.
        </P>
        <OrganizationResourcesDiagram />
        <Heading id="roles" level="h2">
            Roles
        </Heading>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Role</TableHead>
                        <TableHead className="bg-muted/50">Access</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {organizationRoles.map((role) => (
                        <TableRow key={role.name}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                        <role.icon aria-hidden={true} className="size-4" />
                                    </div>
                                    <Code>{role.name}</Code>
                                </div>
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">{role.access}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </Stack>
);
