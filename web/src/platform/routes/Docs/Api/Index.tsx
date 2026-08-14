import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import {
    Activity,
    AppWindow,
    ArrowLeftRight,
    Building2,
    Code2,
    Database,
    HardDrive,
    KeyRound,
    Logs,
    Palette,
    PanelTop,
    Rocket,
    Route,
    ServerCog,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { publicSeoMeta } from '@/lib/seo';
import { Wordmark } from '@/components/Wordmark';
import { DocsArticle } from '@/platform/routes/Docs/Article';

const capabilities = {
    authentication: {
        name: 'Authentication',
        icon: KeyRound,
    },
    organizations: {
        name: 'Organizations',
        icon: Building2,
    },
    permissions: {
        name: 'Permissions',
        icon: ShieldCheck,
    },
    theming: { name: 'Theming', icon: Palette },
    applicationShell: {
        name: 'Application shell',
        icon: PanelTop,
    },
    applicationContract: {
        name: 'Application contract',
        icon: AppWindow,
    },
    applicationLogic: {
        name: 'Application logic',
        icon: Code2,
    },
    databases: {
        name: 'Databases',
        icon: Database,
    },
    storage: {
        name: 'Storage',
        icon: HardDrive,
    },
    routing: {
        name: 'Routing',
        icon: Route,
    },
    deployment: {
        name: 'Deployment',
        icon: Rocket,
    },
    logs: { name: 'Logs', icon: Logs },
    status: {
        name: 'Status',
        icon: Activity,
    },
};

/** Renders a labeled capability icon. */
function CapabilityIcon({
    className = 'text-secondary',
    icon: Icon,
    name,
    size = 16,
}: (typeof capabilities)[keyof typeof capabilities] & { className?: string; size?: number }) {
    return <Icon aria-label={name} className={className} size={size} />;
}

/** Renders the production request flow diagram. */
function PlatformFlowDiagram() {
    return (
        <Grid columns={{ minWidth: 180, max: 3, repeat: 'fit' }} gap={6} align="center">
            <Stack direction="horizontal" gap={6} align="center" justify="end">
                <Card width="80%" variant="muted">
                    <Stack gap={3} align="center">
                        <UserRound aria-hidden className="text-accent" size={20} />
                        <Stack gap={0} align="center">
                            <Text weight="semibold">User</Text>
                            <Text type="supporting">Browser</Text>
                        </Stack>
                        <Stack className="pb-3" direction="horizontal" gap={3} justify="center">
                            <CapabilityIcon {...capabilities.theming} />
                            <CapabilityIcon {...capabilities.applicationShell} />
                        </Stack>
                    </Stack>
                </Card>
                <ArrowLeftRight aria-label="User and platform request flow" className="text-secondary" size={16} />
            </Stack>
            <Card padding={6} variant="muted">
                <Stack gap={3} align="center">
                    <ServerCog aria-hidden className="text-accent" size={20} />
                    <Stack gap={0} align="center">
                        <Wordmark />
                        <Text type="supporting">Platform</Text>
                    </Stack>
                    <Stack className="pb-3" gap={3} align="center">
                        <Stack direction="horizontal" gap={3} justify="center">
                            <CapabilityIcon {...capabilities.authentication} />
                            <CapabilityIcon {...capabilities.organizations} />
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <CapabilityIcon {...capabilities.permissions} />
                            <CapabilityIcon {...capabilities.routing} />
                            <CapabilityIcon {...capabilities.deployment} />
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center">
                            <CapabilityIcon {...capabilities.logs} />
                            <CapabilityIcon {...capabilities.status} />
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
                        <CapabilityIcon {...capabilities.applicationContract} className="text-accent" size={20} />
                        <Stack gap={0} align="center">
                            <Text weight="semibold">Application</Text>
                            <Text type="supporting">Runtime</Text>
                        </Stack>
                        <Stack className="pb-3" direction="horizontal" gap={3} justify="center">
                            <CapabilityIcon {...capabilities.applicationLogic} />
                            <CapabilityIcon {...capabilities.databases} />
                            <CapabilityIcon {...capabilities.storage} />
                        </Stack>
                    </Stack>
                </Card>
            </Stack>
        </Grid>
    );
}

export const metadata = {
    path: '/docs/api',
    title: 'Overview',
    seoTitle: 'Platform Documentation | LongLink',
    description: 'Understand the LongLink Platform for organizations, applications, infrastructure, and operations.',
    toc: [{ id: 'platform', label: 'Platform', level: 1 }],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Api/Index.tsx',
};

function Content() {
    return (
        <Stack gap={5}>
            <Heading id="platform" level={1}>
                Platform
            </Heading>
            <Text as="p">
                The LongLink Platform provides the shared foundation for running applications across an organization. It
                manages users, organizations, access, applications, deployments, and the infrastructure they depend on.
            </Text>
            <Text as="p">
                Applications remain separate services with their own code and purpose. LongLink provides the layer
                around them: it controls access, prepares the resources each application needs, makes applications
                available to the right users, and provides visibility into deployments, logs, and status.
            </Text>
            <Text as="p">
                This gives teams a consistent and governed way to operate many dedicated applications without rebuilding
                the same operational foundation for each one.
            </Text>
            <PlatformFlowDiagram />
        </Stack>
    );
}

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
