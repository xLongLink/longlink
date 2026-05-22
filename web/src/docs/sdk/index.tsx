import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';

/** Renders the SDK overview page. */
export default function SdkOverviewPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    Application SDK
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    The LongLink SDK is a thin integration layer built on top of the standard Python backend ecosystem.
                    It does not introduce a new framework or replace existing tools. Instead, it provides a structured
                    way to compose and connect them within the LongLink platform.
                </P>
                <P className="max-w-3xl text-muted-foreground">Applications follow a simple model:</P>
                <Ul className="text-muted-foreground">
                    <Li>Business logic lives in the application code</Li>
                    <Li>Structured data is stored in a relational database</Li>
                    <Li>Unstructured data is stored in S3-compatible object storage</Li>
                </Ul>
            </section>

            <section className="space-y-4">
                <Heading id="getting-started" level="h2" className="text-foreground">
                    Getting Started
                </Heading>

                <section className="space-y-3">
                    <Heading id="install" level="h3" className="text-foreground">Install</Heading>
                    <div className="space-y-3">
                        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            <code>{"[uv]\nuv add longlink"}</code>
                        </pre>
                        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            <code>{"[pip]\npip install longlink"}</code>
                        </pre>
                    </div>
                </section>

                <section className="space-y-3">
                    <Heading id="initialize-a-project" level="h3" className="text-foreground">
                        Initialize a Project
                    </Heading>
                    <div className="space-y-3">
                        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            <code>{"[uv]\nuv add longlink\nuv run longlink init"}</code>
                        </pre>
                        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            <code>{"[pip]\npip install longlink\nlonglink init"}</code>
                        </pre>
                    </div>
                </section>
            </section>

            <section className="space-y-4">
                <Heading id="applications" level="h2" className="text-foreground">
                    Applications
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    <Code>longlink init</Code> creates a minimal application scaffold:
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"├── src/\n│   ├── api/          # Route registration\n│   ├── models/       # Database models\n│   ├── pages/        # XML page definitions\n│   ├── types/        # Data schemas\n│   └── envs.py       # Configuration\n├── tests/\n│   ├── api/          # API tests\n│   └── conftest.py   # Test setup\n├── main.py           # Entry point\n├── Dockerfile        # Container build definition\n├── pyproject.toml    # Project configuration\n├── .env.sample       # Environment template\n├── AGENTS.md         # Platform metadata\n└── README.md"}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="local-development" level="h2" className="text-foreground">
                    Local Development
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Install development dependencies:</P>
                <div className="space-y-3">
                    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <code>{"[uv]\nuv add .[dev]\nuv run longlink dev"}</code>
                    </pre>
                    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <code>{"[pip]\npip install .[dev]\nlonglink dev"}</code>
                    </pre>
                </div>
            </section>

            <section className="space-y-4">
                <Heading id="resources" level="h2" className="text-foreground">
                    Resources
                </Heading>
                <Ul className="text-muted-foreground">
                    <Li>
                        <A
                            href="https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Official FastAPI Backend Template
                        </A>
                    </Li>
                </Ul>
            </section>
        </article>
    );
}
