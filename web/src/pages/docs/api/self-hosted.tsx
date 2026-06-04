import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/self-hosted.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="self-hosted-control-plane" level="h1">
            Self-hosted Control Plane
        </Heading>
        <p className="leading-7">Use self-hosted mode when you run the LongLink control plane in your own infrastructure.</p>
        <Heading id="infrastructure" level="h2">
            Infrastructure
        </Heading>
        <p className="leading-7">Provide these systems before you deploy LongLink:</p>
        <ul className="ml-6 list-disc space-y-2">
            <li>A Kubernetes cluster for the control plane and application workloads</li>
            <li>A PostgreSQL or MySQL server for database provisioning</li>
            <li>S3-compatible object storage for files and artifacts</li>
        </ul>
        <Heading id="required-environment-variables" level="h2">
            Required Environment Variables
        </Heading>
        <p className="leading-7">
            Configure the API container with session and control-plane settings. Database, storage, and compute
            backends are registered through the API.
        </p>
        <Heading id="session" level="h3">
            Session
        </Heading>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">SESSION_KEY</code>
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">DATABASE_URL</code>
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">URL</code>
            </li>
        </ul>
        <Heading id="database" level="h3">
            Database
        </Heading>
        <p className="leading-7">
            Register database backends after startup. Their connection details live in the control plane database, not
            in API env vars.
        </p>
        <Heading id="storage" level="h3">
            Storage
        </Heading>
        <p className="leading-7">
            Register storage backends after startup. The API reads bucket connection details from the storage registry.
        </p>
        <Heading id="compute" level="h3">
            Compute
        </Heading>
        <p className="leading-7">
            Register compute backends after startup. The API bootstraps a shared cluster proxy from the registered
            kubeconfig, then uses the configured ingress host for app proxying.
        </p>
        <Heading id="deployment-model" level="h2">
            Deployment Model
        </Heading>
        <p className="leading-7">Deploy the control plane container and application containers in the same Kubernetes cluster.</p>
        <p className="leading-7">
            This keeps control-plane traffic inside the cluster boundary and avoids public ingress for application
            routing.
        </p>
    </div>
);
