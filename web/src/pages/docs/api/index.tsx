import type { IconName } from '@astryxdesign/core/Icon';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import {
    Activity,
    AppWindow,
    ArrowLeftRight,
    Building2,
    Code2,
    Database,
    HardDrive,
    KeyRound,
    Languages,
    Logs,
    Palette,
    PanelTop,
    Rocket,
    Route,
    ServerCog,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';

const sharedFoundationItems: { description: string; icon: IconName; name: string }[] = [
    {
        name: 'Authentication',
        description: 'Email, password, OAuth, sessions, and current-user context.',
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
        <Grid columns={{ minWidth: 180, max: 3, repeat: 'fit' }} gap={6} align="center">
            <Stack direction="horizontal" gap={6} align="center" justify="end">
                <Card width="80%" variant="muted">
                    <Stack gap={3} align="center">
                        <Icon icon={UserRound} color="accent" aria-hidden />
                        <Text weight="semibold">User</Text>
                        <Text type="supporting">Browser</Text>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Icon icon={Languages} size="sm" color="secondary" aria-label="Languages" />
                            <Icon icon={Palette} size="sm" color="secondary" aria-label="Theming" />
                            <Icon icon={PanelTop} size="sm" color="secondary" aria-label="Application shell" />
                        </Stack>
                    </Stack>
                </Card>
                <Icon icon={ArrowLeftRight} size="sm" color="secondary" aria-label="User and platform request flow" />
            </Stack>
            <Card padding={6} variant="muted">
                <Stack gap={3} align="center">
                    <Icon icon={ServerCog} color="accent" aria-hidden />
                    <Wordmark />
                    <Text type="supporting">Platform</Text>
                    <Stack gap={3} align="center">
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Icon icon={KeyRound} size="sm" color="secondary" aria-label="Identity" />
                            <Icon icon={Building2} size="sm" color="secondary" aria-label="Organizations" />
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Icon icon={ShieldCheck} size="sm" color="secondary" aria-label="Policy" />
                            <Icon icon={Route} size="sm" color="secondary" aria-label="Routing" />
                            <Icon icon={Rocket} size="sm" color="secondary" aria-label="Deployment" />
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Icon icon={Logs} size="sm" color="secondary" aria-label="Logs" />
                            <Icon icon={Activity} size="sm" color="secondary" aria-label="Status" />
                        </Stack>
                    </Stack>
                </Stack>
            </Card>
            <Stack direction="horizontal" gap={6} align="center" justify="start">
                <Icon
                    icon={ArrowLeftRight}
                    size="sm"
                    color="secondary"
                    aria-label="Platform and application request flow"
                />
                <Card width="80%" variant="muted">
                    <Stack gap={3} align="center">
                        <Icon icon={AppWindow} color="accent" aria-hidden />
                        <Text weight="semibold">Application</Text>
                        <Text type="supporting">Runtime</Text>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Icon icon={Code2} size="sm" color="secondary" aria-label="Application logic" />
                            <Icon icon={Database} size="sm" color="secondary" aria-label="Database logic" />
                            <Icon icon={HardDrive} size="sm" color="secondary" aria-label="File storage" />
                        </Stack>
                    </Stack>
                </Card>
            </Stack>
        </Grid>
    );
}

export const metadata = {
    toc: [{ id: 'shared-foundation', label: 'Shared Foundation' }],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/index.tsx',
};

export const content = (
    <Stack gap={5}>
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
                </TableRow>
            </TableHeader>
            <TableBody>
                {sharedFoundationItems.map((item) => (
                    <TableRow key={item.name}>
                        <TableCell>
                            <Stack gap={1}>
                                <Stack direction="horizontal" gap={2} align="center">
                                    <Icon icon={item.icon} size="sm" color="accent" />
                                    <Text weight="semibold">{item.name}</Text>
                                </Stack>
                                <Text type="supporting">{item.description}</Text>
                            </Stack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Stack>
);
