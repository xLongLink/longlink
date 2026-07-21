import type { IconName } from '@astryxdesign/core/Icon';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const organizationRoles: { access: string; icon: IconName; name: string }[] = [
    { name: 'read', access: 'View organization data and access assigned resources.', icon: 'eyeSlash' },
    {
        name: 'write',
        access: 'Read access plus create and update supported organization resources.',
        icon: 'arrowUp',
    },
    {
        name: 'maintain',
        access: 'Write access plus invitations, application creation, previews, and runtime access.',
        icon: 'wrench',
    },
    {
        name: 'admin',
        access: 'Full access to roles, invitations, applications, previews, and runtime access.',
        icon: 'checkDouble',
    },
    {
        name: 'owner',
        access: 'Highest access to ownership, settings, members, applications, and resources.',
        icon: 'success',
    },
];

const organizationResources: { description: string; icon: IconName; name: string }[] = [
    { name: 'Users', description: 'Members and roles', icon: 'info' },
    { name: 'Database', description: 'Database schemas', icon: 'viewColumns' },
    { name: 'File Storage', description: 'One bucket with scoped prefixes', icon: 'copy' },
    { name: 'Applications', description: 'Runtime services', icon: 'wrench' },
];

/** Renders the organization resource ownership diagram. */
function OrganizationResourcesDiagram() {
    return (
        <Stack gap={4}>
            <Card variant="muted">
                <Stack gap={2} align="center">
                    <Icon icon="success" color="accent" />
                    <Text weight="semibold">Organization</Text>
                </Stack>
            </Card>
            <Grid columns={{ minWidth: 160, max: 4, repeat: 'fit' }} gap={4}>
                {organizationResources.map((resource) => (
                    <Card key={resource.name} variant="muted">
                        <Stack gap={2} align="center">
                            <Icon icon={resource.icon} color="accent" />
                            <Text weight="semibold">{resource.name}</Text>
                            <Text type="supporting">{resource.description}</Text>
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
    <Stack gap={4}>
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
        <Table<Record<string, unknown>>>
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Access</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {organizationRoles.map((role) => (
                    <TableRow key={role.name}>
                        <TableCell>
                            <Stack direction="horizontal" gap={2} align="center">
                                <Icon icon={role.icon} size="sm" color="accent" />
                                <Code>{role.name}</Code>
                            </Stack>
                        </TableCell>
                        <TableCell>{role.access}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Stack>
);
