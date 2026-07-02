import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/storage.tsx',
};

export const content = (
    <Stack>
        <Heading id="storage" level="h1">
            Storage
        </Heading>
        <P>
            LongLink SDK exposes a native <Code>fs</Code> object. You can use it like a standard{' '}
            <A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec</A> filesystem.
        </P>
        <P>
            In production, the platform injects <Code>LONGLINK_STORAGE_URL</Code>, <Code>LONGLINK_STORAGE_BUCKET</Code>,
            and <Code>LONGLINK_STORAGE_SHARED_BUCKET</Code> for the backend connection, app bucket, and organization
            shared bucket.
        </P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")`}</CodeBlock>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <Ul>
            <Li>
                <A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec Documentation</A>
            </Li>
            <Li>
                <A href="https://github.com/fsspec/filesystem_spec">fsspec GitHub</A>
            </Li>
        </Ul>
    </Stack>
);
