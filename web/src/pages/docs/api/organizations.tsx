import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ul } from '@/components/ui/ul';
import { BookOpen, Crown, GitPullRequest, PenLine, Settings2 } from 'lucide-react';

const organizationRoles = [
    {
        name: 'read',
        description: 'View organization data and access assigned resources.',
        capabilities: 'View organization data and assigned resources.',
        icon: BookOpen,
    },
    {
        name: 'write',
        description: 'Read access plus create and update organization resources.',
        capabilities: 'Read access plus create and update supported organization resources.',
        icon: GitPullRequest,
    },
    {
        name: 'maintain',
        description: 'Write access plus manage settings for supported resources.',
        capabilities:
            'Invite members, create applications, inspect database table previews, and open application runtimes through organization-level access.',
        icon: PenLine,
    },
    {
        name: 'admin',
        description: 'Full access to the organization and its resources.',
        capabilities:
            'Invite members, change member roles, create applications, inspect database table previews, and open application runtimes through organization-level access.',
        icon: Settings2,
    },
    {
        name: 'owner',
        description: 'Highest access. Can manage ownership and all organization settings.',
        capabilities:
            'Invite members, change member roles, create applications, inspect database table previews, and open application runtimes through organization-level access.',
        icon: Crown,
    },
] as const;

export const metadata = {
    lastUpdated: '2026-07-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/organizations.tsx',
};

export const content = (
    <Stack>
        <Heading id="organizations" level="h1">
            Organizations
        </Heading>
        <P>
            Organizations are the tenant boundary in LongLink. They group members, invitations, applications, database
            resources, storage resources, and the location where runtime infrastructure is provisioned.
        </P>
        <P>
            Every application belongs to one organization. Organization membership controls who can see the workspace,
            manage people, deploy applications, inspect resources, and open application runtimes.
        </P>
        <Heading id="creating-organizations" level="h2">
            Creating Organizations
        </Heading>
        <P>
            Any authenticated user can create an organization. The creator becomes the initial <Code>owner</Code>.
        </P>
        <P>
            During creation, LongLink initializes the organization infrastructure when configured backends are
            available. This includes a compute namespace, an organization database with a shared schema, and a
            shared storage bucket.
        </P>
        <Heading id="roles" level="h2">
            Roles
        </Heading>
        <P>Organization roles are ordered from least access to most access:</P>
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
        <Heading id="members-and-invitations" level="h2">
            Members And Invitations
        </Heading>
        <P>
            Organization members are active users with one organization role. Invitations are pending email-based
            membership requests. LongLink rejects duplicate invitations and invitations for users who are already
            members.
        </P>
        <P>
            Organization access is private. Users who are not members receive not-found style responses instead of
            membership details.
        </P>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <P>Organization pages expose the runtime resources LongLink manages for the workspace:</P>
        <Ul>
            <Li>Applications registered in the organization, including the caller's application role when present.</Li>
            <Li>The shared schema and application database schemas, with availability and usage information.</Li>
            <Li>Preview rows for shared and application tables. System schemas are blocked.</Li>
            <Li>Shared and application storage buckets, with availability information.</Li>
        </Ul>
    </Stack>
);
