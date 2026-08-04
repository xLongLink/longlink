import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import {
    ArrowUp,
    Boxes,
    Building2,
    CheckCheck,
    CheckCircle,
    Database,
    EyeOff,
    HardDrive,
    Info,
    Wrench,
} from 'lucide-react';
import { DocsBanner } from '@/components/DocsBanner';

const organizationRoles = [
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

const organizationResources = [
    { name: 'Users', description: 'Members and roles', icon: Info },
    { name: 'Database', description: 'Database schemas', icon: Database },
    { name: 'File Storage', description: 'One bucket with scoped prefixes', icon: HardDrive },
    { name: 'Compute', description: 'Runtime services', icon: Boxes },
];

export const metadata = {
    toc: [
        { id: 'organizations', label: 'Organizations', level: 1 },
        { id: 'users', label: 'Users', level: 2 },
        { id: 'roles', label: 'Roles', level: 3 },
        { id: 'database', label: 'Database', level: 2 },
        { id: 'file-storage', label: 'File Storage', level: 2 },
        { id: 'compute', label: 'Compute', level: 2 },
    ],
    lastUpdated: '2026-07-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/api/organizations.tsx',
};

export const content = (
    <Stack gap={5}>
        <DocsBanner variant="organizations" />
        <Heading id="organizations" level={1}>
            Organizations
        </Heading>
        <Text as="p">
            Organizations are the tenant boundary in LongLink. They group members, invitations, Applications, and their
            automatically assigned, immutable compute, database, and storage registries.
        </Text>
        <Text as="p">
            Every application belongs to one organization. Organization membership controls who can see the workspace,
            manage people, deploy applications, inspect resources, and open application runtimes.
        </Text>
        <Stack gap={4}>
            <Card variant="muted">
                <Stack gap={2} align="center">
                    <Building2 aria-hidden="true" className="text-accent" size={20} />
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
        <Heading id="users" level={2}>
            Users
        </Heading>
        <Heading id="roles" level={3}>
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
        <Heading id="database" level={2}>
            Database
        </Heading>
        <Heading id="file-storage" level={2}>
            File Storage
        </Heading>
        <Heading id="compute" level={2}>
            Compute
        </Heading>
    </Stack>
);
