import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ul } from '@/components/ui/ul';
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
        <Heading id="image-registration" level="h2">
            Image Registration
        </Heading>
        <P>
            Applications are added from container images built with <Code>longlink build</Code>. The image must include
            LongLink metadata labels such as the app name, version, title, description, and environment requirements.
            LongLink records the resolved manifest digest and deploys that immutable digest instead of the mutable tag.
        </P>
        <P>
            Production deployments use public image registries. Local and private image registries are rejected unless
            development mode explicitly allows the configured local registry.
        </P>
        <Heading id="creation-and-deployment" level="h2">
            Creation and Deployment
        </Heading>
        <P>
            Organization members with <Code>maintain</Code>, <Code>admin</Code>, or <Code>owner</Code> access can create
            applications.
        </P>
        <P>When an application is created, LongLink:</P>
        <Ul>
            <Li>
                inspects the image metadata, resolves the image digest, and validates supported icons and managed
                resource names.
            </Li>
            <Li>requires image-declared environment values unless the platform manages them.</Li>
            <Li>selects active compute, database, and storage registries for the organization's location.</Li>
            <Li>provisions Kubernetes, PostgreSQL, and storage resources for the application.</Li>
            <Li>queues a verification operation that checks whether the rollout becomes healthy.</Li>
        </Ul>
        <Heading id="environment-values" level="h2">
            Environment Values
        </Heading>
        <P>
            Application images can declare required and optional environment variables. Required values must be provided
            during application creation unless they are platform-managed values.
        </P>
        <P>
            Platform-managed values use the <Code>LONGLINK_</Code> prefix. User-supplied <Code>LONGLINK_</Code> values
            are stripped before deployment, and the control plane injects production database and storage settings.
        </P>
        <Heading id="statuses" level="h2">
            Statuses
        </Heading>
        <Ul>
            <Li>
                <Code>creating</Code>: the application record exists and deployment verification is still running.
            </Li>
            <Li>
                <Code>running</Code>: the newest rollout pods are ready and the application can receive gateway traffic.
            </Li>
            <Li>
                <Code>failed</Code>: rollout verification found crashing current pods.
            </Li>
        </Ul>
        <Heading id="access-and-gateway" level="h2">
            Access and Gateway
        </Heading>
        <P>
            Users open applications through the LongLink web shell. Runtime requests use the application proxy endpoint,
            where the API resolves access, verifies application status, enforces method-level runtime roles, and builds
            a secret-authenticated request to the selected cluster gateway.
        </P>
        <P>
            The gateway accepts only traffic signed with the registry secret, strips the secret before forwarding, and
            routes the request to the internal application service. LongLink forwards the current user id and effective
            runtime role as <Code>x-user-id</Code> and <Code>x-user-role</Code>.
        </P>
        <P>
            Runtime requests are role-gated by method: <Code>read</Code> can use read methods, <Code>write</Code> can
            also use write methods, and <Code>maintain</Code>, <Code>admin</Code>, or <Code>owner</Code> can use{' '}
            <Code>DELETE</Code>.
        </P>
        <P>
            Users with an application role can open the runtime. Organization members with <Code>maintain</Code>,{' '}
            <Code>admin</Code>, or <Code>owner</Code> access can also open applications through organization-level
            access.
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
        <Heading id="logs" level="h2">
            Logs
        </Heading>
        <P>
            Elevated organization members and application maintainers or admins can fetch recent plain-text logs from
            the newest application pod. Logs are intended for deployment verification and troubleshooting.
        </P>
    </Stack>
);
