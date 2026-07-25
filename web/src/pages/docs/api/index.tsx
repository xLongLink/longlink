import type { LucideIcon } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import {
    Activity,
    AppWindow,
    ArrowLeftRight,
    ArrowUp,
    ArrowUpDown,
    Building2,
    CheckCheck,
    CheckCircle,
    Code2,
    Columns,
    Copy,
    Database,
    HardDrive,
    Info,
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
    Wrench,
} from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';

const sharedFoundationItems: { description: string; icon: LucideIcon; name: string }[] = [
    {
        name: 'Authentication',
        description: 'Email, password, OAuth, sessions, and current-user context.',
        icon: CheckCircle,
    },
    {
        name: 'Organizations',
        description: 'Tenant boundaries, memberships, and organization resources.',
        icon: Info,
    },
    {
        name: 'Permissions',
        description: 'Organization and application roles enforced before runtime access.',
        icon: CheckCheck,
    },
    { name: 'Languages', description: 'Locale-aware web shell and application page rendering.', icon: Info },
    { name: 'Theming', description: 'Shared visual system and user interface preferences.', icon: Info },
    {
        name: 'Application shell',
        description: 'Consistent navigation around platform and runtime pages.',
        icon: Columns,
    },
    {
        name: 'Application contract',
        description: 'Metadata, routing, deployment, logs, and runtime access for application services.',
        icon: Wrench,
    },
    {
        name: 'Databases',
        description: 'Organization databases, shared schemas, and application schemas.',
        icon: Columns,
    },
    {
        name: 'Storage',
        description: 'One S3-compatible bucket per Organization, with shared and application prefixes.',
        icon: Copy,
    },
    {
        name: 'Routing',
        description: 'Gateway-backed routing from authenticated users to internal application services.',
        icon: ArrowUpDown,
    },
    {
        name: 'Deployment',
        description: 'Container image inspection, Kubernetes resources, and rollout verification.',
        icon: ArrowUp,
    },
    { name: 'Logs', description: 'Runtime log access for deployment checks and troubleshooting.', icon: Info },
    {
        name: 'Status',
        description: 'Application, registry, and operation state tracked by the platform.',
        icon: CheckCircle,
    },
];

/** Renders the production request flow diagram. */
function PlatformFlowDiagram() {
    return (
        <Grid columns={{ minWidth: 180, max: 3, repeat: 'fit' }} gap={6} align="center">
            <Stack direction="horizontal" gap={6} align="center" justify="end">
                <Card width="80%" variant="muted">
                    <Stack gap={3} align="center">
                        <UserRound aria-hidden className="text-accent" size={20} />
                        <Text weight="semibold">User</Text>
                        <Text type="supporting">Browser</Text>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Languages aria-label="Languages" className="text-secondary" size={16} />
                            <Palette aria-label="Theming" className="text-secondary" size={16} />
                            <PanelTop aria-label="Application shell" className="text-secondary" size={16} />
                        </Stack>
                    </Stack>
                </Card>
                <ArrowLeftRight aria-label="User and platform request flow" className="text-secondary" size={16} />
            </Stack>
            <Card padding={6} variant="muted">
                <Stack gap={3} align="center">
                    <ServerCog aria-hidden className="text-accent" size={20} />
                    <Wordmark />
                    <Text type="supporting">Platform</Text>
                    <Stack gap={3} align="center">
                        <Stack direction="horizontal" gap={3} justify="center">
                            <KeyRound aria-label="Identity" className="text-secondary" size={16} />
                            <Building2 aria-label="Organizations" className="text-secondary" size={16} />
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <ShieldCheck aria-label="Policy" className="text-secondary" size={16} />
                            <Route aria-label="Routing" className="text-secondary" size={16} />
                            <Rocket aria-label="Deployment" className="text-secondary" size={16} />
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Logs aria-label="Logs" className="text-secondary" size={16} />
                            <Activity aria-label="Status" className="text-secondary" size={16} />
                        </Stack>
                    </Stack>
                </Stack>
            </Card>
            <Stack direction="horizontal" gap={6} align="center" justify="start">
                <ArrowLeftRight
                    aria-label="Platform and application request flow"
                    className="text-secondary"
                    size={16}
                />
                <Card width="80%" variant="muted">
                    <Stack gap={3} align="center">
                        <AppWindow aria-hidden className="text-accent" size={20} />
                        <Text weight="semibold">Application</Text>
                        <Text type="supporting">Runtime</Text>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <Code2 aria-label="Application logic" className="text-secondary" size={16} />
                            <Database aria-label="Database logic" className="text-secondary" size={16} />
                            <HardDrive aria-label="File storage" className="text-secondary" size={16} />
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
        <Table<Record<string, unknown>> density="compact">
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Capability</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sharedFoundationItems.map(({ description, icon: ItemIcon, name }) => (
                    <TableRow key={name}>
                        <TableCell>
                            <Stack gap={1}>
                                <Stack direction="horizontal" gap={2} align="center">
                                    <ItemIcon aria-hidden="true" className="text-accent" size={16} />
                                    <Text weight="semibold">{name}</Text>
                                </Stack>
                                <Text type="supporting">{description}</Text>
                            </Stack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Stack>
);
