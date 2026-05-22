import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { Ul } from '@/components/ui/ul';

/** Renders the SDK build page. */
export default function SdkBuildingPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading id="building" level="h1" className="text-foreground">
                    Building
                </Heading>
                <Ul className="text-muted-foreground">
                    <Li>Applications can be built using Docker.</Li>
                    <Li>
                        <Code>longlink build</Code> generates the <Code>Dockerfile</Code> and the <Code>manifest.json</Code>.
                    </Li>
                    <Li>Once containerized, applications can be pushed to any registry.</Li>
                    <Li>Applications can be connected to the control plane and deployed.</Li>
                </Ul>
            </section>

            <section className="space-y-3">
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`[uv]
uv run longlink build`}</code>
                </pre>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`[pip]
longlink build`}</code>
                </pre>
            </section>
        </article>
    );
}
