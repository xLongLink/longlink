import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/index.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="control-plane" level="h1">
            Control Plane
        </Heading>
        <p className="leading-7">
            The Control Plane is the central system that manages and governs all applications in LongLink. It acts as
            the single entry point between users and application services, handling authentication, authorization,
            request routing, and observability.
        </p>
        <p className="leading-7">
            Applications do not interact directly with external clients. Every request flows through the control plane,
            ensuring that access is controlled, behavior is consistent, and all operations are traceable.
        </p>
        <Heading id="infrastructure" level="h2">
            Infrastructure
        </Heading>
        <p className="leading-7">
            The control plane manages and connects to the core infrastructure required to run applications:
        </p>
        <ul className="ml-6 list-disc space-y-2">
            <li>Database, isolated per application</li>
            <li>Object storage, S3-compatible</li>
            <li>Compute, Docker images running on Kubernetes</li>
            <li>Identity provider, OIDC-compatible</li>
        </ul>
        <Heading id="request-flow-permissioning" level="h2">
            Request Flow &amp; Permissioning
        </Heading>
        <p className="leading-7">
            All interactions with applications are proxied through the control plane. It enforces authentication and
            permissions before routing requests and returning responses.
        </p>
    </div>
);
