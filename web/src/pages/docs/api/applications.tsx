import type { IconName } from '@astryxdesign/core/Icon';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const applicationRoles: { access: string; icon: IconName; name: string }[] = [
    {
        name: 'read',
        access: 'View and open the application runtime. Use read runtime methods such as GET.',
        icon: 'eyeSlash',
    },
    {
        name: 'write',
        access: 'Read access plus write runtime methods such as POST, PUT, and PATCH.',
        icon: 'arrowUp',
    },
    {
        name: 'maintain',
        access: 'Write access plus logs, member roles, application deletion, and DELETE runtime methods.',
        icon: 'wrench',
    },
    {
        name: 'admin',
        access: 'Highest application-specific access with authority to assign application roles up to admin.',
        icon: 'success',
    },
];

const runtimeResources: { description: string[]; icon: IconName; name: string }[] = [
    { name: 'Database', icon: 'viewColumns', description: ['Dedicated schema', 'Read access from shared'] },
    { name: 'File Storage', icon: 'copy', description: ['Application prefix', 'Read access to shared prefix'] },
    { name: 'Infrastructure', icon: 'wrench', description: ['Versioned runtime', 'Environment management'] },
];

/** Renders the application database, storage, and infrastructure resource diagram. */
function ApplicationRuntimeResourcesDiagram() {
    return (
        <Grid columns={{ minWidth: 180, max: 3, repeat: 'fit' }} gap={4}>
            {runtimeResources.map((resource) => (
                <Card key={resource.name} variant="muted">
                    <Stack gap={3} align="center">
                        <Icon icon={resource.icon} color="accent" />
                        <Text weight="semibold">{resource.name}</Text>
                        <Stack gap={1} align="center">
                            {resource.description.map((line) => (
                                <Text key={line} type="supporting">
                                    {line}
                                </Text>
                            ))}
                        </Stack>
                    </Stack>
                </Card>
            ))}
        </Grid>
    );
}

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/applications.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="applications" level={1}>
            Applications
        </Heading>
        <Text as="p">
            Applications are containerized LongLink SDK services deployed into an organization. The LongLink Platform
            reads application metadata from the image, provisions runtime resources, verifies the rollout, and routes
            authenticated users to the running service.
        </Text>
        <Text as="p">
            In production, each application receives database and storage access scoped to organization resources. The
            runtime can read and write its own application schema and its application prefix in the Organization bucket.
            It can read the shared schema and the bucket's shared prefix without writing to either. The LongLink
            Platform injects direct application IAM credentials and other environment values as runtime secrets.
        </Text>
        <ApplicationRuntimeResourcesDiagram />
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
                {applicationRoles.map((role) => (
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
