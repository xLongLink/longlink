import { Link } from 'react-router';

import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';

/** Renders the LongLink docs overview page. */
export default function DocsOverviewPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    LongLink
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    LongLink is a platform for building and running applications that manage data, enforce validation
                    rules, and execute structured workflows. It is designed for systems where correctness,
                    consistency, and control over processes are critical.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    The architecture is divided into three primary areas:
                </P>
                <Ul className="max-w-3xl text-muted-foreground">
                    <Li>
                        <Link to="/docs/api" className="font-medium text-foreground hover:underline">
                            Control Plane
                        </Link>{' '}
                        which manages infrastructure concerns such as authentication, authorization, request routing,
                        data provisioning, and observability.
                    </Li>
                    <Li>
                        <Link to="/docs/sdk" className="font-medium text-foreground hover:underline">
                            Applications
                        </Link>{' '}
                        are developed as full-code services using a Python SDK built on top of established technologies
                        such as FastAPI for the API layer and SQLAlchemy for data access. Each application exposes a
                        well-defined REST interface and operates on its own isolated data store and storage layer.
                    </Li>
                    <Li>
                        <Link to="/docs/xml" className="font-medium text-foreground hover:underline">
                            Pages
                        </Link>{' '}
                        define the user interface using XML, which is interpreted at runtime and interacts directly
                        with application APIs. This removes the need for separate frontend implementations while
                        maintaining a strict separation between presentation and business logic.
                    </Li>
                </Ul>
            </section>

            <section className="space-y-4">
                <Heading id="why" level="h2" className="text-foreground">
                    Why
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Modern AI development makes generating code fast and accessible. However, without clear guardrails
                    and a well-defined foundation, codebases tend to become fragmented, inconsistent, and difficult to
                    maintain.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    LongLink addresses this by building on top of production-proven technologies and introducing both a
                    control plane and a predefined application structure. This creates a consistent structure that
                    applications must adhere to, giving both developers and AI a clear system context and well-defined
                    boundaries, which leads to higher-quality output.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    This reduces complexity, enforces best practices by default, and results in applications that are
                    faster to build, easier to maintain, and more reliable over time.
                </P>
            </section>
        </article>
    );
}
