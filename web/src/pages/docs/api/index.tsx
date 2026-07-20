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
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Wordmark } from '@/components/Wordmark';
import { Heading } from '@/components/ui/heading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const sharedFoundationItems = [
    {
        name: 'Authentication',
        description: 'OIDC identity, sessions, and current-user context.',
        icon: KeyRound,
    },
    {
        name: 'Organizations',
        description: 'Tenant boundaries, memberships, and organization resources.',
        icon: Building2,
    },
    {
        name: 'Permissions',
        description: 'Organization and application roles enforced before runtime access.',
        icon: ShieldCheck,
    },
    {
        name: 'Languages',
        description: 'Locale-aware web shell and application page rendering.',
        icon: Languages,
    },
    {
        name: 'Theming',
        description: 'Shared visual system and user interface preferences.',
        icon: Palette,
    },
    {
        name: 'Application shell',
        description: 'Consistent navigation around platform and runtime pages.',
        icon: PanelTop,
    },
    {
        name: 'Application contract',
        description: 'Metadata, routing, deployment, logs, and runtime access for application services.',
        icon: Code2,
    },
    {
        name: 'Databases',
        description: 'Organization databases, shared schemas, and application schemas.',
        icon: Database,
    },
    {
        name: 'Storage',
        description: 'One S3-compatible bucket per Organization, with shared and application prefixes.',
        icon: HardDrive,
    },
    {
        name: 'Routing',
        description: 'Gateway-backed routing from authenticated users to internal application services.',
        icon: Route,
    },
    {
        name: 'Deployment',
        description: 'Container image inspection, Kubernetes resources, and rollout verification.',
        icon: Rocket,
    },
    {
        name: 'Logs',
        description: 'Runtime log access for deployment checks and troubleshooting.',
        icon: Logs,
    },
    {
        name: 'Status',
        description: 'Application, registry, and operation state tracked by the platform.',
        icon: Activity,
    },
] as const;

/** Renders the production request flow diagram. */
function PlatformFlowDiagram() {
    return (
        <div className="rounded-md border bg-muted/10 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_3rem_minmax(0,1fr)] lg:items-center">
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <UserRound aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">User</div>
                        <div className="mt-1 text-sm text-muted-foreground">Browser</div>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1 text-muted-foreground">
                        <Languages aria-label="Languages" className="size-4" />
                        <Palette aria-label="Theming" className="size-4" />
                        <PanelTop aria-label="Application shell" className="size-4" />
                    </div>
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                    <ArrowLeftRight aria-hidden={true} className="size-5" />
                </div>
                <div className="flex min-h-32 flex-col items-center justify-center rounded-md border bg-muted/40 p-4 text-center">
                    <div className="mb-4 flex flex-col items-center gap-2">
                        <div className="flex size-9 items-center justify-center text-muted-foreground">
                            <ServerCog aria-hidden={true} className="size-5" />
                        </div>
                        <div>
                            <div className="font-medium text-foreground">
                                <Wordmark />
                            </div>
                            <div className="text-sm text-muted-foreground">Platform</div>
                        </div>
                    </div>
                    <div className="grid gap-2 text-muted-foreground">
                        <div className="flex items-center justify-center gap-3">
                            <KeyRound aria-label="Authentication and identity" className="size-4" />
                            <Building2 aria-label="Organizations and permissions" className="size-4" />
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <ShieldCheck aria-label="Policies and access control" className="size-4" />
                            <Route aria-label="Routing and access control" className="size-4" />
                            <Rocket aria-label="Deployment" className="size-4" />
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <Logs aria-label="Logs" className="size-4" />
                            <Activity aria-label="Logs, status, and operations" className="size-4" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                    <ArrowLeftRight aria-hidden={true} className="size-5" />
                </div>
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <AppWindow aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">Application</div>
                        <div className="mt-1 text-sm text-muted-foreground">Runtime</div>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1 text-muted-foreground">
                        <Code2 aria-label="Application logic" className="size-4" />
                        <Database aria-label="Database logic" className="size-4" />
                        <HardDrive aria-label="File storage" className="size-4" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/index.tsx',
};

export const content = (
    <Stack>
        <Heading id="platform" level="h1">
            Platform
        </Heading>
        <P>
            The LongLink Platform owns the shared operating model. It stores users, organizations, memberships,
            applications, infrastructure registries, reconciliation Operations, and deployment state, then exposes the
            API and web shell used to manage them.
        </P>
        <P>
            It does not replace application code. Applications still run as separate SDK services; the LongLink Platform
            provides the governed layer around them: identity, access decisions, resource provisioning, routing, rollout
            verification, logs, and status.
        </P>
        <P>
            Production runtime traffic is mediated by the API proxy and the per-compute TLS gateway. The API authorizes
            the user and forwards approved requests with trusted runtime headers; the gateway accepts only authenticated
            proxy traffic and routes it to the internal application service.
        </P>
        <PlatformFlowDiagram />
        <Heading id="shared-foundation" level="h2">
            Shared Foundation
        </Heading>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Capability</TableHead>
                        <TableHead className="bg-muted/50">Platform responsibility</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sharedFoundationItems.map((item) => (
                        <TableRow key={item.name}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                        <item.icon aria-hidden={true} className="size-4" />
                                    </div>
                                    <span className="font-medium text-foreground">{item.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">
                                {item.description}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </Stack>
);
