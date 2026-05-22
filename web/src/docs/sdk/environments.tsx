import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';

/** Renders the SDK environments page. */
export default function SdkEnvironmentsPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Environments</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    The <Code>Environments</Code> class defines and validates environment variables for an application.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    The class is a wrapper around{' '}
                    <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/" target="_blank" rel="noopener noreferrer">
                        Pydantic Settings
                    </A>
                    . LongLink loads and validates all environment variables at application startup.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    This ensures that configuration errors are detected early, before the application starts handling
                    requests.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="usage" level="h2" className="text-foreground">Usage</Heading>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`from longlink import Environments, LongLink


class Env(Environments):
    """Project-specific environment model."""

    FEATURE_FLAG: bool
    EXTERNAL_API: str


env = Env()
app = LongLink(env=env)`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="resources" level="h2" className="text-foreground">Resources</Heading>
                <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/" target="_blank" rel="noopener noreferrer">
                    Pydantic Settings
                </A>
            </section>
        </article>
    );
}
