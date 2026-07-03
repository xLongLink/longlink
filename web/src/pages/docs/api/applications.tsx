import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/applications.tsx',
};

export const content = (
    <Stack>
        <Heading id="applications" level="h1">
            Applications
        </Heading>
        <P>
            Applications are containerized LongLink SDK services deployed into an organization. The control plane reads
            application metadata from the image, provisions runtime resources, verifies the rollout, and routes
            authenticated users to the running service.
        </P>
        <Heading id="image-registration" level="h2">
            Image Registration
        </Heading>
        <P>
            Applications are added from container images built with <Code>longlink build</Code>. The image must include
            LongLink metadata labels such as the app name, version, title, description, and environment requirements.
        </P>
        <P>
            Production deployments use public image registries. Local and private image registries are rejected unless
            development mode explicitly allows the configured local registry.
        </P>
        <Heading id="creation-and-deployment" level="h2">
            Creation And Deployment
        </Heading>
        <P>
            Organization members with <Code>maintain</Code>, <Code>admin</Code>, or <Code>owner</Code> access can create
            applications.
        </P>
        <P>When an application is created, LongLink:</P>
        <Ul>
            <Li>inspects the image metadata and validates supported icons and managed resource names.</Li>
            <Li>requires image-declared environment values unless the platform manages them.</Li>
            <Li>selects active compute, database, and storage registries for the organization's location.</Li>
            <Li>provisions Kubernetes, PostgreSQL, and storage resources for the application.</Li>
            <Li>queues a verification operation that checks whether the rollout becomes healthy.</Li>
        </Ul>
        <Heading id="environment-values" level="h2">
            Environment Values
        </Heading>
        <P>
            Application images can declare required and optional environment variables. Required values must be provided
            during application creation unless they are platform-managed values.
        </P>
        <P>
            Platform-managed values use the <Code>LONGLINK_</Code> prefix. User-supplied <Code>LONGLINK_</Code> values
            are stripped before deployment, and the control plane injects production database and storage settings.
        </P>
        <Heading id="statuses" level="h2">
            Statuses
        </Heading>
        <Ul>
            <Li>
                <Code>creating</Code>: the application record exists and deployment verification is still running.
            </Li>
            <Li>
                <Code>running</Code>: the newest rollout pods are ready and the application can receive proxied traffic.
            </Li>
            <Li>
                <Code>failed</Code>: rollout verification found crashing current pods.
            </Li>
        </Ul>
        <Heading id="access-and-proxying" level="h2">
            Access And Proxying
        </Heading>
        <P>
            Users access applications through the control plane, not directly through public application ingress.
            LongLink checks access, rejects unavailable applications with a no-store <Code>503</Code>, strips unsafe
            headers, and forwards the current user id as <Code>x-user-id</Code>.
        </P>
        <P>
            The proxy supports <Code>GET</Code>, <Code>POST</Code>, <Code>PATCH</Code>, and <Code>DELETE</Code> requests
            to non-root application paths. The proxied application root path is intentionally not exposed.
        </P>
        <P>
            Users with an application role can open the runtime. Organization members with <Code>maintain</Code>,{' '}
            <Code>admin</Code>, or <Code>owner</Code> access can also open applications through organization-level
            access.
        </P>
        <Heading id="logs" level="h2">
            Logs
        </Heading>
        <P>
            Elevated organization members and application maintainers or admins can fetch recent plain-text logs from
            the newest application pod. Logs are intended for deployment verification and troubleshooting.
        </P>
    </Stack>
);
