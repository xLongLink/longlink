import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';

/** Renders the control plane documentation page. */
export default function ControlPlanePage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    Control Plane
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    The Control Plane is the central system that manages and governs all applications in LongLink. It
                    acts as the single entry point between users and application services, handling authentication,
                    authorization, request routing, and observability.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    Applications do not interact directly with external clients. Every request flows through the
                    control plane, ensuring that access is controlled, behavior is consistent, and all operations are
                    traceable.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="infrastructure" level="h2" className="text-foreground">
                    Infrastructure
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    The control plane manages and connects to the core infrastructure required to run applications:
                </P>
                <Ul className="text-muted-foreground">
                    <Li>Database (isolated per application)</Li>
                    <Li>Object Storage (S3-compatible)</Li>
                    <Li>Compute (Docker images running on Kubernetes)</Li>
                    <Li>Identity Provider (OIDC-compatible)</Li>
                </Ul>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`flowchart TB
    CP[Control Plane]

    CP --> IDP[(Identity Provider)]
    CP --> DB[(Database)]
    CP --> ST[(Object Storage)]
    CP --> C[(Compute)]`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading
                    id="request-flow-permissioning"
                    level="h2"
                    className="text-foreground"
                >
                    Request Flow &amp; Permissioning
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    All interactions with applications are proxied through the control plane. It enforces
                    authentication and permissions before routing requests and returning responses.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`flowchart TB
    CP[Control Plane]

    UI[Client]
    A1[Application 1]
    A2[Application 2]
    A3[Application 3]

    UI <--> CP
    CP <--> A1
    CP <--> A2
    CP <--> A3`}</code>
                </pre>
            </section>
        </article>
    );
}
