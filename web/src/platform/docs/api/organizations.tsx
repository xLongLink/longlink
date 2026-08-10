import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { ArrowUp, CheckCheck, CheckCircle, EyeOff, Wrench } from 'lucide-react';

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

export const metadata = {
    toc: [
        { id: 'organizations', label: 'Organizations', level: 1 },
        { id: 'users', label: 'Users', level: 2 },
        { id: 'database', label: 'Database', level: 2 },
        { id: 'file-storage', label: 'File Storage', level: 2 },
        { id: 'compute', label: 'Compute', level: 2 },
    ],
    lastUpdated: '2026-07-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/api/organizations.tsx',
};

export const content = (
    <Stack gap={5}>
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
        <Heading id="users" level={2}>
            Users
        </Heading>
        <Table<Record<string, unknown>> density="compact">
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Roles</TableHeaderCell>
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
