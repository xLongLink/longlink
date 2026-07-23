import type { LucideIcon } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { ArrowUp, CheckCircle, Columns, Copy, EyeOff, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const applicationRoles: { access: string; icon: LucideIcon; name: string }[] = [
    {
        name: 'read',
        access: 'View and open the application runtime. Use read runtime methods such as GET.',
        icon: EyeOff,
    },
    {
        name: 'write',
        access: 'Read access plus write runtime methods such as POST, PUT, and PATCH.',
        icon: ArrowUp,
    },
    {
        name: 'maintain',
        access: 'Write access plus logs, member roles, application deletion, and DELETE runtime methods.',
        icon: Wrench,
    },
    {
        name: 'admin',
        access: 'Highest application-specific access with authority to assign application roles up to admin.',
        icon: CheckCircle,
    },
];

const runtimeResources: { description: string[]; icon: LucideIcon; name: string }[] = [
    { name: 'Database', icon: Columns, description: ['Dedicated schema', 'Read access from shared'] },
    { name: 'File Storage', icon: Copy, description: ['Application prefix', 'Read access to shared prefix'] },
    { name: 'Infrastructure', icon: Wrench, description: ['Versioned runtime', 'Environment management'] },
];

/** Renders the application database, storage, and infrastructure resource diagram. */
function ApplicationRuntimeResourcesDiagram() {
    return (
        <Grid columns={{ minWidth: 180, max: 3, repeat: 'fit' }} gap={4}>
            {runtimeResources.map(({ description, icon: ResourceIcon, name }) => (
                <Card key={name} variant="muted">
                    <Stack gap={3} align="center">
                        <ResourceIcon aria-hidden="true" className="text-accent" size={20} />
                        <Text weight="semibold">{name}</Text>
                        <Stack gap={1} align="center">
                            {description.map((line) => (
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
    toc: [{ id: 'roles', label: 'Roles' }],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/applications.tsx',
};

export const content = (
    <Stack gap={5}>
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
        <Table<Record<string, unknown>> density="compact">
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Role</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {applicationRoles.map(({ access, icon: RoleIcon, name }) => (
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
