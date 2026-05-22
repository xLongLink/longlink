import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';

/** Renders the SDK storage page. */
export default function SdkStoragePage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Storage</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    LongLink SDK exposes a native <Code>fs</Code> object. You can use it like a standard{' '}
                    <A href="https://filesystem-spec.readthedocs.io/en/latest/" target="_blank" rel="noopener noreferrer">
                        fsspec
                    </A>{' '}
                    filesystem.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="usage" level="h2" className="text-foreground">Usage</Heading>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="resources" level="h2" className="text-foreground">Resources</Heading>
                <A href="https://filesystem-spec.readthedocs.io/en/latest/" target="_blank" rel="noopener noreferrer">fsspec Documentation</A>
                <A href="https://github.com/fsspec/filesystem_spec" target="_blank" rel="noopener noreferrer">fsspec GitHub</A>
            </section>
        </article>
    );
}
