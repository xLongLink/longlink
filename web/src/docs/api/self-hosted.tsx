import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';

/** Renders the self-hosted control plane page. */
export default function SelfHostedControlPlanePage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    Self-hosted Control Plane
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use self-hosted mode when you run the LongLink control plane in your own infrastructure.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="infrastructure" level="h2" className="text-foreground">
                    Infrastructure
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Provide these systems before you deploy LongLink:
                </P>
                <Ul className="text-muted-foreground">
                    <Li>A Kubernetes cluster for the control plane and application workloads</Li>
                    <Li>A PostgreSQL server for database provisioning</Li>
                    <Li>S3-compatible object storage for files and artifacts</Li>
                </Ul>
            </section>

            <section className="space-y-4">
                <Heading
                    id="required-environment-variables"
                    level="h2"
                    className="text-foreground"
                >
                    Required Environment Variables
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Configure the API container with these variables:
                </P>

                <div className="space-y-4">
                    <section className="space-y-2">
                        <Heading id="session" level="h3" className="text-foreground">
                            Session
                        </Heading>
                        <Ul className="text-muted-foreground">
                            <Li><Code>SESSION_KEY</Code></Li>
                        </Ul>
                    </section>

                    <section className="space-y-2">
                        <Heading id="compute" level="h3" className="text-foreground">
                            Compute
                        </Heading>
                        <Ul className="text-muted-foreground">
                            <Li><Code>COMPUTE_URL</Code></Li>
                            <Li><Code>COMPUTE_KUBE_CONFIG_PATH</Code></Li>
                        </Ul>
                    </section>

                    <section className="space-y-2">
                        <Heading id="database" level="h3" className="text-foreground">
                            Database
                        </Heading>
                        <Ul className="text-muted-foreground">
                            <Li><Code>DATABASE_HOST</Code></Li>
                            <Li><Code>DATABASE_PORT</Code></Li>
                            <Li><Code>DATABASE_USERNAME</Code></Li>
                            <Li><Code>DATABASE_PASSWORD</Code></Li>
                        </Ul>
                    </section>

                    <section className="space-y-2">
                        <Heading level="h3" className="text-foreground">Optional</Heading>
                        <Ul className="text-muted-foreground">
                            <Li><Code>DATABASE_SSLMODE</Code></Li>
                        </Ul>
                        <P className="max-w-3xl text-muted-foreground">
                            Use database administrator credentials for <Code>ENV_PROVISION_DATABASE_USERNAME</Code> and{' '}
                            <Code>ENV_PROVISION_DATABASE_PASSWORD</Code>. The account must be able to create databases on
                            the <Code>postgres</Code> maintenance database.
                        </P>
                    </section>

                    <section className="space-y-2">
                        <Heading id="storage" level="h3" className="text-foreground">Storage</Heading>
                        <Ul className="text-muted-foreground">
                            <Li><Code>STORAGE_PROTOCOL</Code></Li>
                            <Li><Code>STORAGE_ENDPOINT_URL</Code></Li>
                            <Li><Code>STORAGE_ACCESS_KEY_ID</Code></Li>
                            <Li><Code>STORAGE_SECRET_ACCESS_KEY</Code></Li>
                        </Ul>
                    </section>

                    <section className="space-y-2">
                        <Heading level="h3" className="text-foreground">Optional</Heading>
                    </section>
                </div>
            </section>

            <section className="space-y-4">
                <Heading id="deployment-model" level="h2" className="text-foreground">
                    Deployment Model
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Deploy the control plane container and application containers in the same Kubernetes cluster.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    This keeps control-plane traffic inside the cluster boundary and avoids public ingress for
                    application routing.
                </P>
            </section>
        </article>
    );
}
