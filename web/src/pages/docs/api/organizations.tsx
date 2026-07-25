import type { LucideIcon } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { ArrowUp, CheckCheck, CheckCircle, Columns, Copy, EyeOff, Info, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const organizationRoles: { access: string; icon: LucideIcon; name: string }[] = [
    { name: 'read', access: 'View organization data and access assigned resources.', icon: EyeOff },
    {
        name: 'write',
        access: 'Read access plus create and update supported organization resources.',
        icon: ArrowUp,
    },
    {
        name: 'maintain',
        access: 'Write access plus invitations, application creation, previews, and runtime access.',
        icon: Wrench,
    },
    {
        name: 'admin',
        access: 'Full access to roles, invitations, applications, previews, and runtime access.',
        icon: CheckCheck,
    },
    {
        name: 'owner',
        access: 'Highest access to ownership, settings, members, applications, and resources.',
        icon: CheckCircle,
    },
];

const organizationResources: { description: string; icon: LucideIcon; name: string }[] = [
    { name: 'Users', description: 'Members and roles', icon: Info },
    { name: 'Database', description: 'Database schemas', icon: Columns },
    { name: 'File Storage', description: 'One bucket with scoped prefixes', icon: Copy },
    { name: 'Applications', description: 'Runtime services', icon: Wrench },
];

/** Renders the organization resource ownership diagram. */
function OrganizationResourcesDiagram() {
    return (
        <Stack gap={4}>
            <Card variant="muted">
                <Stack gap={2} align="center">
                    <CheckCircle aria-hidden="true" className="text-accent" size={20} />
                    <Text weight="semibold">Organization</Text>
                </Stack>
            </Card>
            <Grid columns={{ minWidth: 160, max: 4, repeat: 'fit' }} gap={4}>
                {organizationResources.map(({ description, icon: ResourceIcon, name }) => (
                    <Card key={name} variant="muted">
                        <Stack gap={2} align="center">
                            <ResourceIcon aria-hidden="true" className="text-accent" size={20} />
                            <Text weight="semibold">{name}</Text>
                            <Text type="supporting">{description}</Text>
                        </Stack>
                    </Card>
                ))}
            </Grid>
        </Stack>
    );
}

export const metadata = {
    toc: [{ id: 'roles', label: 'Roles' }],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/organizations.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="organizations" level={1}>
            Organizations
        </Heading>
        <Text as="p">
            Organizations are the tenant boundary in LongLink. They group members, invitations, Applications, and their
            immutable compute, database, and storage registry assignments.
        </Text>
        <Text as="p">
            Every application belongs to one organization. Organization membership controls who can see the workspace,
            manage people, deploy applications, inspect resources, and open application runtimes.
        </Text>
        <OrganizationResourcesDiagram />
        <Heading id="roles" level={2}>
            Roles
        </Heading>
        <Table<Record<string, unknown>> density="compact">
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Role</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {organizationRoles.map(({ access, icon: RoleIcon, name }) => (
                    <TableRow key={name}>
                        <TableCell>
                            <Stack gap={1}>
                                <Stack direction="horizontal" gap={2} align="center">
                                    <RoleIcon aria-hidden="true" className="text-accent" size={16} />
                                    <Text type="body" weight="semibold">
                                        {name}
                                    </Text>
                                </Stack>
                                <Text type="supporting">{access}</Text>
                            </Stack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Stack>
);
