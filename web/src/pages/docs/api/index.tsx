import type { IconName } from '@astryxdesign/core/Icon';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { Wordmark } from '@/components/Wordmark';

const sharedFoundationItems: { description: string; icon: IconName; name: string }[] = [
    {
        name: 'Authentication',
        description: 'Email, password, OAuth, OIDC, sessions, and current-user context.',
        icon: 'success',
    },
    {
        name: 'Organizations',
        description: 'Tenant boundaries, memberships, and organization resources.',
        icon: 'info',
    },
    {
        name: 'Permissions',
        description: 'Organization and application roles enforced before runtime access.',
        icon: 'checkDouble',
    },
    { name: 'Languages', description: 'Locale-aware web shell and application page rendering.', icon: 'info' },
    { name: 'Theming', description: 'Shared visual system and user interface preferences.', icon: 'info' },
    {
        name: 'Application shell',
        description: 'Consistent navigation around platform and runtime pages.',
        icon: 'viewColumns',
    },
    {
        name: 'Application contract',
        description: 'Metadata, routing, deployment, logs, and runtime access for application services.',
        icon: 'wrench',
    },
    {
        name: 'Databases',
        description: 'Organization databases, shared schemas, and application schemas.',
        icon: 'viewColumns',
    },
    {
        name: 'Storage',
        description: 'One S3-compatible bucket per Organization, with shared and application prefixes.',
        icon: 'copy',
    },
    {
        name: 'Routing',
        description: 'Gateway-backed routing from authenticated users to internal application services.',
        icon: 'arrowsUpDown',
    },
    {
        name: 'Deployment',
        description: 'Container image inspection, Kubernetes resources, and rollout verification.',
        icon: 'arrowUp',
    },
    { name: 'Logs', description: 'Runtime log access for deployment checks and troubleshooting.', icon: 'info' },
    {
        name: 'Status',
        description: 'Application, registry, and operation state tracked by the platform.',
        icon: 'success',
    },
];

/** Renders the production request flow diagram. */
function PlatformFlowDiagram() {
    return (
        <Grid columns={{ minWidth: 180, max: 3, repeat: 'fit' }} gap={4}>
            <Card variant="muted">
                <Stack gap={2} align="center">
                    <Icon icon="info" color="accent" />
                    <Text weight="semibold">User</Text>
                    <Text type="supporting">Browser</Text>
                    <Text type="supporting">Languages, theming, and application shell</Text>
                </Stack>
            </Card>
            <Card variant="teal">
                <Stack gap={2} align="center">
                    <Icon icon="success" color="accent" />
                    <Wordmark />
                    <Text type="supporting">Platform</Text>
                    <Text type="supporting">Identity, policy, routing, deployment, logs, and status</Text>
                </Stack>
            </Card>
            <Card variant="muted">
                <Stack gap={2} align="center">
                    <Icon icon="wrench" color="accent" />
                    <Text weight="semibold">Application</Text>
                    <Text type="supporting">Runtime</Text>
                    <Text type="supporting">Application logic, database logic, and file storage</Text>
                </Stack>
            </Card>
        </Grid>
    );
}

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/index.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="platform" level={1}>
            Platform
        </Heading>
        <Text as="p">
            The LongLink Platform owns the shared operating model. It stores users, organizations, memberships,
            applications, infrastructure registries, reconciliation Operations, and deployment state, then exposes the
            API and web shell used to manage them.
        </Text>
        <Text as="p">
            It does not replace application code. Applications still run as separate SDK services; the LongLink Platform
            provides the governed layer around them: identity, access decisions, resource provisioning, routing, rollout
            verification, logs, and status.
        </Text>
        <Text as="p">
            Production runtime traffic is mediated by the API proxy and the per-compute TLS gateway. The API authorizes
            the user and forwards approved requests with trusted runtime headers; the gateway accepts only authenticated
            proxy traffic and routes it to the internal application service.
        </Text>
        <PlatformFlowDiagram />
        <Heading id="shared-foundation" level={2}>
            Shared Foundation
        </Heading>
        <Table<Record<string, unknown>>>
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Capability</TableHeaderCell>
                    <TableHeaderCell>Platform responsibility</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sharedFoundationItems.map((item) => (
                    <TableRow key={item.name}>
                        <TableCell>
                            <Stack direction="horizontal" gap={2} align="center">
                                <Icon icon={item.icon} size="sm" color="accent" />
                                <Text weight="semibold">{item.name}</Text>
                            </Stack>
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Stack>
);
