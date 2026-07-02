import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/index.tsx',
};

export const content = (
    <Stack>
        <Heading id="control-plane" level="h1">
            Control Plane
        </Heading>
        <P>
            The Control Plane is the central system that manages and governs all applications in LongLink. It acts as
            the single entry point between users and application services, handling authentication, authorization,
            request routing, and observability.
        </P>
        <P>
            Applications do not interact directly with external clients. Every request flows through the control plane,
            ensuring that access is controlled, behavior is consistent, and all operations are traceable.
        </P>
        <Heading id="infrastructure" level="h2">
            Infrastructure
        </Heading>
        <P>The control plane manages and connects to the core infrastructure required to run applications:</P>
        <Ul>
            <Li>Database, isolated per application</Li>
            <Li>Object storage, S3-compatible</Li>
            <Li>Compute, Docker images running on Kubernetes</Li>
            <Li>Identity provider, OIDC-compatible</Li>
        </Ul>
        <Heading id="request-flow-permissioning" level="h2">
            Request Flow &amp; Permissioning
        </Heading>
        <P>
            All interactions with applications are proxied through the control plane. It enforces authentication and
            permissions before routing requests and returning responses.
        </P>
    </Stack>
);
