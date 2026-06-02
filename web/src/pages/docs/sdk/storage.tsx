import { A } from '@/components/ui/a';
import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/storage.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="storage" level="h1">
            Storage
        </Heading>
        <p className="leading-7">
            LongLink SDK exposes a native <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">fs</code>{' '}
            object. You can use it like a standard{' '}
            <A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec</A> filesystem.
        </p>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")`}</CodeBlock>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec Documentation</A>
            </li>
            <li>
                <A href="https://github.com/fsspec/filesystem_spec">fsspec GitHub</A>
            </li>
        </ul>
    </div>
);
