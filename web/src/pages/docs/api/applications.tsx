import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Database, GitPullRequest, HardDrive, PenLine, ServerCog, Settings2 } from 'lucide-react';

const applicationRoles = [
    {
        name: 'read',
        access: 'View and open the application runtime. Use read runtime methods such as GET.',
        icon: BookOpen,
    },
    {
        name: 'write',
        access: 'Read access plus write runtime methods such as POST, PUT, and PATCH.',
        icon: GitPullRequest,
    },
    {
        name: 'maintain',
        access: 'Write access plus logs, member roles, application deletion, and DELETE runtime methods.',
        icon: PenLine,
    },
    {
        name: 'admin',
        access: 'Highest application-specific access with authority to assign application roles up to admin.',
        icon: Settings2,
    },
] as const;

/** Renders the application database, storage, and infrastructure resource diagram. */
function ApplicationRuntimeResourcesDiagram() {
    return (
        <div className="rounded-md border bg-muted/10 p-4">
            <div className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-md border bg-muted/40 px-4 py-5 text-center">
                        <div className="flex size-9 items-center justify-center text-muted-foreground">
                            <Database aria-hidden={true} className="size-5" />
                        </div>
                        <div className="font-medium text-foreground">Database</div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                            <div>Dedicated schema</div>
                            <div>Read access from shared</div>
                        </div>
                    </div>
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-md border bg-muted/40 px-4 py-5 text-center">
                        <div className="flex size-9 items-center justify-center text-muted-foreground">
                            <HardDrive aria-hidden={true} className="size-5" />
                        </div>
                        <div className="font-medium text-foreground">File Storage</div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                            <div>Dedicated bucket</div>
                            <div>Read access from shared</div>
                        </div>
                    </div>
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-md border bg-muted/40 px-4 py-5 text-center">
                        <div className="flex size-9 items-center justify-center text-muted-foreground">
                            <ServerCog aria-hidden={true} className="size-5" />
                        </div>
                        <div className="font-medium text-foreground">Infrastructure</div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                            <div>Versioned runtime</div>
                            <div>Environment management</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/applications.tsx',
};

export const content = (
    <Stack>
        <Heading id="applications" level="h2">
            Applications
        </Heading>
        <P>
            Applications are containerized LongLink SDK services deployed into an organization. The control plane reads
            application metadata from the image, provisions runtime resources, verifies the rollout, and routes
            authenticated users to the running service.
        </P>
        <P>
            In production, each application receives database and storage access scoped to organization resources. The
            runtime can read and write its own application schema and bucket, can read the shared schema and shared
            bucket without writing to either, and runs from versioned image metadata with environment values injected as
            runtime secrets.
        </P>
        <ApplicationRuntimeResourcesDiagram />
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
                            <TableCell className="whitespace-normal text-muted-foreground">{role.access}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </Stack>
);
