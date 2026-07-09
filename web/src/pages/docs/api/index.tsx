import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ul } from '@/components/ui/ul';
import {
    Activity,
    Building2,
    Database,
    HardDrive,
    KeyRound,
    Languages,
    Logs,
    Palette,
    PanelTop,
    Rocket,
    Route,
    ShieldCheck,
} from 'lucide-react';

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
        name: 'App shell',
        description: 'Consistent navigation around control-plane and runtime pages.',
        icon: PanelTop,
    },
    {
        name: 'Databases',
        description: 'Organization databases, shared schemas, and application schemas.',
        icon: Database,
    },
    {
        name: 'Storage',
        description: 'S3-compatible buckets scoped to organizations and applications.',
        icon: HardDrive,
    },
    {
        name: 'Routing',
        description: 'Gateway-backed routing from authenticated users to internal app services.',
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

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/index.tsx',
};

export const content = (
    <Stack>
        <Heading id="control-plane" level="h1">
            Control Plane
        </Heading>
        <P>
            The control plane is the platform service that owns LongLink's shared operating model. It stores users,
            organizations, memberships, applications, locations, infrastructure registries, operations, and deployment
            state, then exposes the API and web shell used to manage them.
        </P>
        <P>
            It does not replace application code. Applications still run as separate SDK services; the control plane
            provides the governed layer around them: identity, access decisions, resource provisioning, routing, rollout
            verification, logs, and status.
        </P>
        <P>
            Production runtime traffic is mediated by the API proxy and the per-cluster gateway. The API authorizes the
            user and forwards approved requests with trusted runtime headers; the gateway accepts only authenticated
            proxy traffic and routes it to the internal application service.
        </P>
        <Heading id="shared-foundation" level="h2">
            Shared Foundation
        </Heading>
        <P>The control plane provides the common platform layer that every business-process application needs:</P>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Capability</TableHead>
                        <TableHead className="bg-muted/50">Control plane responsibility</TableHead>
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
        <Heading id="infrastructure" level="h2">
            Infrastructure
        </Heading>
        <P>
            The control plane connects to location-scoped infrastructure registries instead of hard-coding one provider:
        </P>
        <Ul>
            <Li>Compute registries manage Kubernetes namespaces, workloads, services, and the per-cluster gateway.</Li>
            <Li>Database registries provision organization databases, the shared schema, and application schemas.</Li>
            <Li>Storage registries provision S3-compatible organization and application buckets.</Li>
            <Li>OIDC identity providers supply login, sessions, and current-user context.</Li>
        </Ul>
        <Heading id="request-flow-permissioning" level="h2">
            Request Flow &amp; Permissioning
        </Heading>
        <P>
            Users open application routes from the LongLink web shell. Runtime requests reach the API proxy first, where
            LongLink resolves the application, checks organization and application access, enforces method-level runtime
            roles, verifies that the application is running, and attaches trusted identity headers.
        </P>
        <P>
            Approved requests are forwarded to the selected compute gateway with a registry secret. The gateway rejects
            direct traffic that does not carry that secret, removes the secret before the request reaches application
            code, rewrites the path, and forwards the request to the internal application service.
        </P>
    </Stack>
);
