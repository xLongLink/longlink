import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-07',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/self-hosted.tsx',
};

export const content = (
    <Stack>
        <Heading id="self-hosted-control-plane" level="h1">
            Self-hosted Control Plane
        </Heading>
        <P>Use self-hosted mode when you run the LongLink control plane in your own infrastructure.</P>
        <Heading id="infrastructure" level="h2">
            Infrastructure
        </Heading>
        <P>Provide these systems before you deploy LongLink:</P>
        <Ul>
            <Li>A Kubernetes cluster for the control plane and application workloads</Li>
            <Li>A PostgreSQL server for organization databases and application schemas</Li>
            <Li>S3-compatible object storage for files and artifacts</Li>
        </Ul>
        <Heading id="required-environment-variables" level="h2">
            Required Environment Variables
        </Heading>
        <P>
            Configure the API container with session, database, and OIDC settings. Database, storage, and compute
            backends are registered through the API after startup.
        </P>
        <Heading id="api-runtime" level="h3">
            API Runtime
        </Heading>
        <Ul>
            <Li>
                <Code>DATABASE_URL</Code> points to the control-plane database.
            </Li>
            <Li>
                <Code>SESSION_KEY</Code> is a random signing secret with at least 32 characters.
            </Li>
            <Li>
                <Code>CONTROL_PLANE_URL</Code> is the public API origin that per-cluster gateways call for request
                authorization.
            </Li>
            <Li>
                <Code>SESSION_COOKIE_DOMAIN</Code> can share the session cookie with app gateway subdomains when the
                gateway and control plane use sibling hosts.
            </Li>
            <Li>
                <Code>DEVELOPMENT</Code> must be unset or <Code>false</Code> in production.
            </Li>
            <Li>
                <Code>DATABASE_SSLMODE</Code> defaults to <Code>require</Code> for PostgreSQL backend connections.
            </Li>
        </Ul>
        <Heading id="oidc" level="h3">
            OIDC
        </Heading>
        <Ul>
            <Li>
                <Code>OIDC_CLIENT_ID</Code> identifies the LongLink API client.
            </Li>
            <Li>
                <Code>OIDC_CLIENT_SECRET</Code> stores the OIDC client secret.
            </Li>
            <Li>
                <Code>OIDC_ISSUER</Code> must be an HTTPS issuer URL outside development.
            </Li>
            <Li>
                <Code>OIDC_REDIRECT_URI</Code> must be an HTTPS callback URL outside development.
            </Li>
        </Ul>
        <Heading id="cors" level="h3">
            CORS
        </Heading>
        <Ul>
            <Li>
                <Code>CORS_ORIGINS</Code> is optional and should only include trusted frontend origins when the web
                bundle is served from a separate origin.
            </Li>
        </Ul>
        <Heading id="database" level="h3">
            Database
        </Heading>
        <P>
            Register database backends after startup. Their connection details live in the control plane database, not
            in API env vars.
        </P>
        <Heading id="storage" level="h3">
            Storage
        </Heading>
        <P>
            Register storage backends after startup. The API uses the control-plane endpoint for bucket provisioning and
            passes the runtime endpoint and scoped credentials to application pods through separate LongLink-managed
            storage environment variables.
        </P>
        <Heading id="compute" level="h3">
            Compute
        </Heading>
        <P>
            Register dedicated compute clusters after startup. The API stores the registered kubeconfig, gateway host,
            optional LoadBalancer IP, and gateway TLS certificate material, installs a per-cluster Envoy gateway, and
            keeps gateway routes synchronized with managed application services.
        </P>
        <P>
            Production compute registrations require gateway TLS certificate material. If the gateway host and control
            plane host differ, <Code>SESSION_COOKIE_DOMAIN</Code> must cover both hosts so browser sessions reach the
            authorization endpoint.
        </P>
        <Heading id="startup-validation" level="h2">
            Startup Validation
        </Heading>
        <P>
            When development mode is off, the API fails startup for placeholder session keys, short session keys,
            non-HTTPS control-plane URLs, or non-HTTPS OIDC issuer and redirect URLs. Keep local HTTP values only in
            development mode.
        </P>
        <Heading id="deployment-model" level="h2">
            Deployment Model
        </Heading>
        <P>Deploy the control plane outside or inside the compute clusters.</P>
        <P>
            Application traffic enters each compute cluster through its LongLink gateway. The gateway calls the public
            control-plane API for authorization, then forwards approved requests to internal ClusterIP services.
        </P>
    </Stack>
);
